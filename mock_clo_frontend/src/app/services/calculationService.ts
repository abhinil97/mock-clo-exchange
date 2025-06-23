import { SHARE_CLASSES, USDC_METADATA } from "../constants/addresses";

export class CalculationService {
  /**
   * Calculate estimated shares based on investment amount and exchange price
   */
  static getEstimatedShares(investmentAmount: string, exchangePrice: string): string {
    if (!investmentAmount || !exchangePrice) return "0";
    const amount = Number(investmentAmount);
    const price = Number(exchangePrice);
    if (price <= 0) return "0";
    return (amount / price).toFixed(6);
  }

  /**
   * Calculate estimated cost based on shares and exchange price
   */
  static getEstimatedCost(shares: string, exchangePrice: string): string {
    if (!shares || !exchangePrice) return "0";
    const shareAmount = Number(shares);
    const price = Number(exchangePrice);
    return (shareAmount * price).toFixed(6);
  }

  /**
   * Calculate estimated USDC value for withdrawal
   */
  static getEstimatedWithdrawalValue(
    withdrawAmount: string, 
    exchangePrice: string, 
    shareClassBalance: string, 
    withdrawType: "full" | "partial"
  ): string {
    const amount = withdrawType === "full" ? shareClassBalance : withdrawAmount;
    if (!amount || !exchangePrice) return "0";
    const amountNum = Number(amount);
    const price = Number(exchangePrice);
    return (amountNum * price).toFixed(6);
  }

  /**
   * Format address for display (truncated)
   */
  static formatAddress(address: string, prefixLength = 6, suffixLength = 4): string {
    if (!address) return "";
    if (address.length <= prefixLength + suffixLength) return address;
    return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
  }

  /**
   * Get share class name by address
   */
  static getShareClassName(address: string): string {
    if (address === USDC_METADATA) return "USDC";
    const shareClass = SHARE_CLASSES.find(sc => sc.address === address);
    return shareClass?.name || CalculationService.formatAddress(address);
  }

  /**
   * Format balance with appropriate currency label
   */
  static formatBalance(balance: string, assetAddress: string): string {
    const currency = assetAddress === USDC_METADATA ? "USDC" : "Tokens";
    return `${balance} ${currency}`;
  }

  /**
   * Validate investment amount
   */
  static validateInvestmentAmount(amount: string, maxAmount: string): string | null {
    if (!amount || Number(amount) <= 0) {
      return "Please enter a valid investment amount";
    }
    if (Number(amount) > Number(maxAmount)) {
      return `Insufficient balance. Maximum available: ${maxAmount}`;
    }
    return null;
  }

  /**
   * Validate withdrawal amount
   */
  static validateWithdrawalAmount(
    amount: string, 
    balance: string, 
    withdrawType: "full" | "partial"
  ): string | null {
    if (Number(balance) <= 0) {
      return "You don't have any tokens to withdraw from this share class";
    }

    if (withdrawType === "partial") {
      if (!amount || Number(amount) <= 0) {
        return "Please enter a valid withdrawal amount";
      }
      if (Number(amount) > Number(balance)) {
        return `Insufficient balance. You have ${balance} tokens but are trying to withdraw ${amount}`;
      }
    }
    
    return null;
  }

  /**
   * Validate share class address
   */
  static validateShareClassAddress(address: string): string | null {
    if (!address || !address.startsWith("0x")) {
      return "Invalid share class address. Must start with 0x";
    }
    return null;
  }

  /**
   * Calculate inline conversion estimate for UI
   */
  static getInlineConversionEstimate(
    amount: string, 
    exchangePrice: string, 
    direction: "toShares" | "toUSDC"
  ): string {
    if (!amount || !exchangePrice) return "0";
    
    const amountNum = Number(amount);
    const price = Number(exchangePrice);
    
    if (direction === "toShares") {
      return (amountNum / price).toFixed(6);
    } else {
      return (amountNum * price).toFixed(6);
    }
  }
} 