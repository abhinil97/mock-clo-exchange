// Common type definitions

export interface ShareClass {
  name: string;
  address: string;
}

export interface WalletProps {
  walletAddress: string | null;
  aptBalance: string;
  usdcBalance: string;
}

export interface TransactionResult {
  hash: string;
}

export interface AssetBalance {
  amount: string;
  asset_type: string;
}

export interface AssetMetadata {
  decimals: number;
  asset_type: string;
}

export type Currency = "APT" | "USDC";
export type WithdrawType = "full" | "partial";
export type InputMode = "select" | "manual";
export type TabOption = "create" | "invest" | "withdraw" | "updatePrice";

export interface TransactionPayload {
  function: string;
  type_arguments: string[];
  arguments: string[];
}

export interface PetraWalletError {
  code?: number;
  message?: string;
  stack?: string;
} 