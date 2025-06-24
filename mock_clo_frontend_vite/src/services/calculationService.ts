import { SHARE_CLASSES, USDC_METADATA } from "../constants/addresses";

export class CalculationService {
  /**
   * Calculate estimated shares based on investment amount and exchange price
   * With the new 1000 conversion factor: shares_minted = (underlying_amount / price_per_share) * 1000
   */
  static getEstimatedShares(investmentAmount: string, exchangePrice: string): string {
    if (!investmentAmount || !exchangePrice) return "0";
    const amount = Number(investmentAmount);
    const price = Number(exchangePrice);
    if (price <= 0) return "0";
    
    // Convert to share units: (amount_in_usdc / price_per_share) * 1000
    // But since shares have 6 decimals, we need to account for that in display
    const shareUnits = (amount / price) * 1000000;
    // Convert to displayable share tokens (divide by 10^6 for 6 decimals)
    const shareTokens = shareUnits / Math.pow(10, 6);
    return shareTokens.toFixed(6);
  }

  /**
   * Calculate estimated cost based on shares and exchange price
   * With the new 1000 conversion factor: underlying_returned = (share_amount * price_per_share) / 1000
   */
  static getEstimatedCost(shares: string, exchangePrice: string): string {
    if (!shares || !exchangePrice) return "0";
    const shareTokens = Number(shares);
    const price = Number(exchangePrice);
    
    // Convert share tokens to share units (multiply by 10^6 for 6 decimals)
    const shareUnits = shareTokens * Math.pow(10, 6);
    // Calculate underlying: (share_units * price_per_share) / 1000
    const underlyingAmount = (shareUnits * price) / 1000000 ;
    // Convert to USDC (divide by 10^6 for 6 decimals)
    const usdcAmount = underlyingAmount / Math.pow(10, 6);
    return usdcAmount.toFixed(6);
  }

  /**
   * Calculate estimated USDC value for withdrawal
   * With the new 1000 conversion factor: underlying_returned = (share_amount * price_per_share) / 1000
   */
  static getEstimatedWithdrawalValue(
    withdrawAmount: string, 
    exchangePrice: string, 
    shareClassBalance: string, 
    withdrawType: "full" | "partial"
  ): string {
    const amount = withdrawType === "full" ? shareClassBalance : withdrawAmount;
    if (!amount || !exchangePrice) return "0";
    const shareTokens = Number(amount);
    const price = Number(exchangePrice);
    
    // Convert share tokens to share units (multiply by 10^6 for 6 decimals)
    const shareUnits = shareTokens * Math.pow(10, 6);
    // Calculate underlying: (share_units * price_per_share) / 1000
    const underlyingAmount = (shareUnits * price)  ;
    // Convert to USDC (divide by 10^6 for 6 decimals)
    const usdcAmount = underlyingAmount / Math.pow(10, 6);
    return usdcAmount.toFixed(6);
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
   * With the new 1000 conversion factor for more granular pricing
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
      // Convert USDC to share tokens: (amount_in_usdc / price_per_share) * 1000 / 10^6
      const shareUnits = (amountNum / price) * 1000000;
      const shareTokens = shareUnits / Math.pow(10, 6);
      return shareTokens.toFixed(6);
    } else {
      // Convert share tokens to USDC: (share_tokens * 10^6 * price_per_share) / 1000 / 10^6
      const shareUnits = amountNum * Math.pow(10, 6);
      const underlyingAmount = (shareUnits * price) ;
      const usdcAmount = underlyingAmount / Math.pow(10, 6);
      return usdcAmount.toFixed(6);
    }
  }

  /**
   * Copy address to clipboard and show user feedback
   */
  static async copyToClipboard(address: string, label?: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(address);
      // Show temporary feedback
      const displayLabel = label || "Address";
      alert(`✅ ${displayLabel} copied to clipboard!\n\n${address}`);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      // Fallback: show address in alert for manual copying
      const displayLabel = label || "Address";
      alert(`📋 Copy ${displayLabel}:\n\n${address}`);
    }
  }

  /**
   * Create a clickable address component that copies on click
   */
  static createClickableTruncatedAddress(
    fullAddress: string, 
    label?: string
  ): {
    onClick: () => Promise<void>;
    title: string;
    style: string;
  } {
    return {
      onClick: () => this.copyToClipboard(fullAddress, label),
      title: `Click to copy full ${label || "address"}: ${fullAddress}`,
      style: "cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors duration-200 px-1 py-0.5 rounded"
    };
  }
} 