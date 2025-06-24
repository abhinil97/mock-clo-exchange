import { useState, useEffect } from "react";
import { useAptos } from "../providers/AptosProvider";
import { convertAmountFromOnChainToHumanReadable } from "@aptos-labs/ts-sdk";
import CreateShareClass from "../pages/CreateShareClass";
import Invest from "../pages/Invest";
import Withdraw from "../pages/Withdraw";
import UpdatePrice from "../pages/UpdatePrice";
import { CalculationService } from "../services/calculationService";

// Window.aptos types are defined in types/petra.d.ts

// Constants
const APTOS_COIN = "0x1::aptos_coin::AptosCoin";
const USDC_ADDRESS = "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b";
const COIN_STORE = `0x1::coin::CoinStore<${APTOS_COIN}>`;
const USDC_COIN_STORE = `0x1::coin::CoinStore<${USDC_ADDRESS}::usdc::USDC>`;

type TabOption = "create" | "invest" | "withdraw" | "updatePrice";

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [aptBalance, setAptBalance] = useState<string>("0");
  const [usdcBalance, setUsdcBalance] = useState<string>("0");
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [activeTab, setActiveTab] = useState<TabOption>("create");

  // Get Aptos client from context
  const { aptos, network } = useAptos();

  // Check if wallet is already connected on page load
  useEffect(() => {
    checkWalletConnection();
  }, []);

  // Fetch balances when wallet address changes
  useEffect(() => {
    if (walletAddress) {
      fetchBalances();
    }
  }, [walletAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkWalletConnection = async () => {
    if (window.aptos) {
      try {
        const isConnected = await window.aptos.isConnected();
        console.log("Wallet connected status:", isConnected);
        
        if (isConnected) {
          const account = await window.aptos.account();
          console.log("Account from wallet:", account);
          
          // Check which network the wallet is connected to
          const network = await window.aptos.network();
          console.log("Wallet network:", network);
          
          setWalletAddress(account.address);
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }
    }
  };

  const fetchBalances = async () => {
    if (!walletAddress) {
      console.log("No wallet address, skipping balance fetch");
      return;
    }

    console.log("Fetching balances for address:", walletAddress);
    setIsLoadingBalances(true);
    
    try {
      // Fetch APT balance
      console.log("Attempting to fetch APT balance...");
      console.log("Resource type:", COIN_STORE);
      
      try {
        const aptResource = await aptos.getAccountResource<{
          coin: {
            value: string;
          };
        }>({
          accountAddress: walletAddress,
          resourceType: COIN_STORE,
        });
        console.log("APT Resource response:", aptResource);
        
        const balance = Number(aptResource.coin.value) / 100_000_000; // APT has 8 decimals
        console.log("Calculated APT Balance:", balance);
        setAptBalance(balance.toFixed(4));
      } catch (aptError: unknown) {
        console.error("Error fetching APT balance:", aptError);
        const error = aptError as { message?: string; status?: number; statusText?: string };
        console.log("APT error details:", {
          message: error?.message,
          status: error?.status,
          statusText: error?.statusText,
          fullError: aptError
        });
        setAptBalance("0");
      }

      // Fetch USDC balance
      console.log("Attempting to fetch USDC balance...");
      console.log("USDC Resource type:", USDC_COIN_STORE);
      
      try {
        const usdcbalance = await aptos.getCurrentFungibleAssetBalances({
          options: {
            where: {
              owner_address: { _eq: walletAddress },
              asset_type: { _eq: USDC_ADDRESS },
            },
          },
        });
        const assetInfo = await aptos.getFungibleAssetMetadata({
          options: {
            where: {
              asset_type: { _eq: USDC_ADDRESS },
            },
          },
        });
        const usdcResource  = convertAmountFromOnChainToHumanReadable(
          usdcbalance[0]?.amount ?? 0,
          assetInfo[0]?.decimals ?? 8
        );
        console.log("USDC Resource response:", usdcbalance);
        
        setUsdcBalance(usdcResource.toFixed(2));
      } catch (usdcError) {
        console.error("Error fetching USDC balance:", usdcError);
        setUsdcBalance("0");
      }
    } catch (error) {
      console.error("General error fetching balances:", error);
    } finally {
      setIsLoadingBalances(false);
    }
  };

  const isPetraInstalled = () => {
    return "aptos" in window;
  };

  const connectWallet = async () => {
    if (!isPetraInstalled()) {
      window.open("https://petra.app/", "_blank");
      return;
    }

    setIsConnecting(true);
    try {
      const response = await window.aptos!.connect();
      setWalletAddress(response.address);
      console.log("Connected to wallet:", response);
    } catch (error) {
      console.error("Error connecting to wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    if (window.aptos) {
      try {
        await window.aptos.disconnect();
        setWalletAddress(null);
        setAptBalance("0");
        setUsdcBalance("0");
        console.log("Disconnected from wallet");
      } catch (error) {
        console.error("Error disconnecting wallet:", error);
      }
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "create":
        return (
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-2xl font-semibold">Create Share Class</h2>
            <p className="text-gray-600 text-center max-w-md">
              Create a new share class for your CLO (Collateralized Loan Obligation).
            </p>
            <CreateShareClass 
              walletAddress={walletAddress}
              aptBalance={aptBalance}
              usdcBalance={usdcBalance}
            />
          </div>
        );
      case "invest":
        return (
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-2xl font-semibold">Invest</h2>
            <p className="text-gray-600 text-center max-w-md">
              Invest in existing share classes and manage your investments.
            </p>
            <Invest 
              walletAddress={walletAddress}
              aptBalance={aptBalance}
              usdcBalance={usdcBalance}
            />
          </div>
        );
      case "withdraw":
        return (
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-2xl font-semibold">Withdraw</h2>
            <p className="text-gray-600 text-center max-w-md">
              Withdraw your investments and claim returns.
            </p>
            <Withdraw 
              walletAddress={walletAddress}
              aptBalance={aptBalance}
              usdcBalance={usdcBalance}
            />
          </div>
        );
      case "updatePrice":
        return (
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-2xl font-semibold">Update Share Price</h2>
            <p className="text-gray-600 text-center max-w-md">
              Update the price per share for existing share classes.
            </p>
            <UpdatePrice 
              walletAddress={walletAddress}
              aptBalance={aptBalance}
              usdcBalance={usdcBalance}
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen dark:bg-gray-950 bg-gray-950">
      {/* Sticky Header and Navigation Container */}
      <div className="sticky top-0 z-50 bg-gray-950">
        {/* Header with Wallet Connection */}
        <header className="shadow-sm border-b border-gray-700 bg-gray-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-xl font-bold text-white">Admin Panel</h1>
              
              {/* Network Info */}
              <div className="text-xs text-gray-400">
                SDK Network: {network}
              </div>
              
              {/* Wallet Connection Section */}
              <div className="flex items-center gap-4">
                {!walletAddress ? (
                  <button
                    onClick={connectWallet}
                    disabled={isConnecting}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isConnecting ? "Connecting..." : "Connect Petra Wallet"}
                  </button>
                ) : (
                  <div className="flex items-center gap-4">
                    {/* Balance Display */}
                    <div className="flex gap-4 text-sm">
                      <span>
                        <span className="font-medium text-gray-400">APT: </span>
                        <span className="font-semibold text-white">
                          {isLoadingBalances ? "..." : aptBalance}
                        </span>
                      </span>
                      <span>
                        <span className="font-medium text-gray-400">USDC: </span>
                        <span className="font-semibold text-white">
                          {isLoadingBalances ? "..." : usdcBalance}
                        </span>
                      </span>
                    </div>
                    
                    <span 
                      className="text-sm font-medium text-white cursor-pointer hover:bg-gray-700 transition-colors duration-200 px-1 py-0.5 rounded"
                      title={`Click to copy full wallet address: ${walletAddress}`}
                      onClick={() => CalculationService.copyToClipboard(walletAddress, "Wallet Address")}
                    >
                      {formatAddress(walletAddress)}
                    </span>
                    
                    <button
                      onClick={disconnectWallet}
                      className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      Disconnect
                    </button>
                    
                    <button
                      onClick={fetchBalances}
                      disabled={isLoadingBalances}
                      className="px-3 py-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      Refresh
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="shadow-sm border-b border-gray-700 bg-gray-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab("create")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "create"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500"
                }`}
              >
                Create Share Class
              </button>
              <button
                onClick={() => setActiveTab("invest")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "invest"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500"
                }`}
              >
                Invest
              </button>
              <button
                onClick={() => setActiveTab("withdraw")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "withdraw"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500"
                }`}
              >
                Withdraw
              </button>
              <button
                onClick={() => setActiveTab("updatePrice")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "updatePrice"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500"
                }`}
              >
                Update Price
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* Scrollable Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-8">
        <div className="pt-0">
          {renderTabContent()}
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 bg-gray-800 right-0 border-t border-gray-700 py-4">
        <div className="text-center">
          <a className="text-gray-300">Made with ❤️ by <span className="text-blue-400">Pact Labs</span></a>
        </div>
      </footer>
    </div>
  );
} 