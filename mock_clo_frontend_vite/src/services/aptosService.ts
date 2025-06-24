import { Aptos } from "@aptos-labs/ts-sdk";
import { MODULE_ADDRESS, USDC_METADATA, TRANSACTION_FUNCTIONS, DECIMALS } from "../constants/addresses";
import { AssetMetadata, TransactionPayload, PetraWalletError } from "../types/common";

export class AptosService {
  constructor(private aptos: Aptos) {}

  /**
   * Fetch exchange price for a share class
   */
  async fetchExchangePrice(assetAddress: string): Promise<string | null> {
    if (!assetAddress || assetAddress === USDC_METADATA) {
      return null;
    }

    try {
      const result = await this.aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::mock_clo_exchange::${TRANSACTION_FUNCTIONS.EXCHANGE_PRICE}`,
          functionArguments: [assetAddress],
        },
      });

      // Result should be a u64 representing underlying units per share
      const pricePerShare = Number(result[0]);
      // Convert from contract's internal representation (with 1000 factor) to user-friendly display
      // Contract stores: price_per_share * 1000 for granularity
      // Display: actual USDC price per share
      const displayPrice = pricePerShare / 1000;
      return displayPrice.toFixed(3);
    } catch (error) {
      console.error("Error fetching exchange price:", error);
      return null;
    }
  }

  /**
   * Fetch user's balance for a specific asset
   */
  async fetchAssetBalance(walletAddress: string, assetAddress: string): Promise<string> {
    if (!walletAddress || !assetAddress) {
      return "0";
    }

    try {
      const userBalance = await this.aptos.getCurrentFungibleAssetBalances({
        options: {
          where: {
            owner_address: { _eq: walletAddress },
            asset_type: { _eq: assetAddress },
          },
        },
      });

      if (userBalance && userBalance.length > 0) {
        // Get asset metadata to determine decimals
        const assetInfo = await this.aptos.getFungibleAssetMetadata({
          options: {
            where: {
              asset_type: { _eq: assetAddress },
            },
          },
        });

        const decimals = assetInfo[0]?.decimals || DECIMALS.DEFAULT_ASSET;
        const balance = Number(userBalance[0].amount) / Math.pow(10, decimals);
        return balance.toFixed(DECIMALS.DISPLAY_PRECISION);
      } else {
        return "0";
      }
    } catch (error) {
      console.error("Error fetching asset balance:", error);
      return "0";
    }
  }

  /**
   * Get asset metadata including decimals
   */
  async getAssetMetadata(assetAddress: string): Promise<AssetMetadata | null> {
    try {
      const assetInfo = await this.aptos.getFungibleAssetMetadata({
        options: {
          where: {
            asset_type: { _eq: assetAddress },
          },
        },
      });

      if (assetInfo && assetInfo.length > 0) {
        return {
          decimals: assetInfo[0].decimals || DECIMALS.DEFAULT_ASSET,
          asset_type: assetAddress
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching asset metadata:", error);
      return null;
    }
  }

  /**
   * Submit create share class transaction (admin only)
   */
  async submitCreateShareClass(
    name: string,
    symbol: string,
    decimals: number,
    underlyingTokenAddr: string,
    pricePerShare: string,
    maxSupply: string
  ): Promise<string> {
    await this.validateWalletConnection();
    await this.validateNetwork();

    // Convert inputs to proper types
    const nameBytes = Array.from(new TextEncoder().encode(name));
    const symbolBytes = Array.from(new TextEncoder().encode(symbol));
    // Convert user-friendly price to contract's internal representation (multiply by 1000)
    const priceInContractFormat = Math.floor(Number(pricePerShare));
    const maxSupplyU128 = maxSupply === "0" ? "0" : Math.floor(Number(maxSupply)).toString();

    console.log("Create share class parameters:", {
      name: nameBytes,
      symbol: symbolBytes,
      decimals,
      underlyingTokenAddr,
      pricePerShare: priceInContractFormat,
      maxSupply: maxSupplyU128
    });

    // Build the transaction payload for Petra
    const payload = {
      function: `${MODULE_ADDRESS}::mock_clo_exchange::create_share_class`,
      type_arguments: [],
      arguments: [
        nameBytes, // vector<u8> name
        symbolBytes, // vector<u8> symbol
        decimals.toString(), // u8 decimals
        underlyingTokenAddr, // address underlying_token_addr
        priceInContractFormat.toString(), // u64 price_per_share 
        maxSupplyU128 // u128 max_supply
      ]
    };

    console.log("Create share class payload:", JSON.stringify(payload, null, 2));

    // Sign and submit via Petra wallet
    console.log("Requesting signature from Petra wallet...");
    const pendingTransaction = await window.aptos!.signAndSubmitTransaction(payload);
    
    console.log("Create share class transaction submitted:", pendingTransaction.hash);

    // Wait for transaction confirmation
    console.log("Waiting for transaction confirmation...");
    const executedTransaction = await this.aptos.waitForTransaction({ 
      transactionHash: pendingTransaction.hash 
    });

    console.log("Create share class confirmed:", executedTransaction);
    return pendingTransaction.hash;
  }

  /**
   * Submit investment transaction
   */
  async submitInvestment(shareClassId: string, investmentAmount: string): Promise<string> {
    await this.validateWalletConnection();
    await this.validateNetwork();

    // Convert investment amount to smallest unit (6 decimals for USDC)
    const amountInSmallestUnit = Math.floor(Number(investmentAmount) * Math.pow(10, DECIMALS.USDC));
    console.log("Amount in smallest unit:", amountInSmallestUnit);

    // Build the transaction payload for Petra
    const payload: TransactionPayload = {
      function: `${MODULE_ADDRESS}::mock_clo_exchange::${TRANSACTION_FUNCTIONS.REQUEST_ISSUANCE}`,
      type_arguments: [],
      arguments: [
        shareClassId, // The fungible asset metadata object address
        amountInSmallestUnit.toString() // u64 amount as string
      ]
    };

    console.log("Transaction payload:", JSON.stringify(payload, null, 2));

    // Sign and submit via Petra wallet
    console.log("Requesting signature from Petra wallet...");
    const pendingTransaction = await window.aptos!.signAndSubmitTransaction(payload);
    
    console.log("Transaction submitted:", pendingTransaction.hash);

    // Wait for transaction confirmation
    console.log("Waiting for transaction confirmation...");
    const executedTransaction = await this.aptos.waitForTransaction({ 
      transactionHash: pendingTransaction.hash 
    });

    console.log("Transaction confirmed:", executedTransaction);
    return pendingTransaction.hash;
  }

  /**
   * Submit withdrawal transaction
   */
  async submitWithdrawal(shareClassId: string, withdrawAmount: string): Promise<string> {
    await this.validateWalletConnection();
    await this.validateNetwork();

    // Get asset metadata to determine proper decimals
    const assetMetadata = await this.getAssetMetadata(shareClassId);
    const decimals = assetMetadata?.decimals || DECIMALS.DEFAULT_ASSET;
    const multiplier = Math.pow(10, decimals);
    
    // Convert withdrawal amount to smallest unit based on asset decimals
    const amountInSmallestUnit = Math.floor(Number(withdrawAmount) * multiplier);
    console.log("Amount in smallest unit:", amountInSmallestUnit, "for asset with", decimals, "decimals");

    // Build the transaction payload for Petra
    const payload: TransactionPayload = {
      function: `${MODULE_ADDRESS}::mock_clo_exchange::${TRANSACTION_FUNCTIONS.REQUEST_REDEMPTION}`,
      type_arguments: [],
      arguments: [
        shareClassId, // The fungible asset metadata object address
        amountInSmallestUnit.toString() // u64 amount as string
      ]
    };

    console.log("Transaction payload:", JSON.stringify(payload, null, 2));

    // Sign and submit via Petra wallet
    console.log("Requesting signature from Petra wallet...");
    const pendingTransaction = await window.aptos!.signAndSubmitTransaction(payload);
    
    console.log("Transaction submitted:", pendingTransaction.hash);

    // Wait for transaction confirmation
    console.log("Waiting for transaction confirmation...");
    const executedTransaction = await this.aptos.waitForTransaction({ 
      transactionHash: pendingTransaction.hash 
    });

    console.log("Transaction confirmed:", executedTransaction);
    return pendingTransaction.hash;
  }

  /**
   * Submit price update transaction (admin only)
   */
  async submitPriceUpdate(shareClassId: string, newPrice: string): Promise<string> {
    await this.validateWalletConnection();
    await this.validateNetwork();

    // Convert user-friendly price to contract's internal representation (multiply by 1000)
    const priceInContractFormat = Math.floor(Number(newPrice));
    console.log("New price in contract format:", priceInContractFormat, "(user input:", newPrice);

    // Build the transaction payload for Petra
    const payload: TransactionPayload = {
      function: `${MODULE_ADDRESS}::mock_clo_exchange::${TRANSACTION_FUNCTIONS.UPDATE_PRICE_PER_SHARE}`,
      type_arguments: [],
      arguments: [
        shareClassId, // The fungible asset metadata object address
        priceInContractFormat.toString() // u64 new price 
      ]
    };

    console.log("Price update payload:", JSON.stringify(payload, null, 2));

    // Sign and submit via Petra wallet
    console.log("Requesting signature from Petra wallet...");
    const pendingTransaction = await window.aptos!.signAndSubmitTransaction(payload);
    
    console.log("Price update transaction submitted:", pendingTransaction.hash);

    // Wait for transaction confirmation
    console.log("Waiting for transaction confirmation...");
    const executedTransaction = await this.aptos.waitForTransaction({ 
      transactionHash: pendingTransaction.hash 
    });

    console.log("Price update confirmed:", executedTransaction);
    return pendingTransaction.hash;
  }

  /**
   * Validate wallet connection
   */
  private async validateWalletConnection(): Promise<void> {
    if (!window.aptos) {
      throw new Error("Petra wallet not found");
    }

    try {
      const isConnected = await window.aptos.isConnected();
      if (!isConnected) {
        throw new Error("Please connect your wallet first");
      }
    } catch (e) {
      console.error("Error checking wallet connection:", e);
      throw e;
    }
  }

  /**
   * Validate network is mainnet
   */
  private async validateNetwork(): Promise<void> {
    const currentNetwork = await window.aptos!.network();
    console.log("Current wallet network:", currentNetwork);
    
    if (!currentNetwork.toLowerCase().includes("mainnet")) {
      throw new Error("Please switch to Mainnet in your Petra wallet");
    }
  }

  /**
   * Handle and format transaction errors
   */
  static handleTransactionError(error: unknown): string {
    console.error("Transaction error:", error);
    const err = error as PetraWalletError;
    console.error("Error details:", {
      code: err?.code,
      message: err?.message,
      stack: err?.stack,
      fullError: error
    });
    
    // Handle different error types
    if (err?.code === 4001) {
      return "Transaction rejected by user";
    } else if (err?.code === 4100) {
      return "The requested method is not supported by Petra";
    } else if (err?.message?.includes("Insufficient balance")) {
      return "Insufficient balance for this transaction";
    } else if (err?.message) {
      return `Error: ${err.message}`;
    } else {
      return "Transaction failed. Please check the console for details.";
    }
  }
} 