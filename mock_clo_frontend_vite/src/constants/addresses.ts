// Blockchain addresses and configuration constants

export const MODULE_ADDRESS = "0xc09d9f882bcd2a8f109d806eae6aa3e1d8f630b18a196142bf6d9b2a4292b092";
export const USDC_METADATA = "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b";

// Admin address from the deployed module
export const ADMIN_ADDRESS = "0xc09d9f882bcd2a8f109d806eae6aa3e1d8f630b18a196142bf6d9b2a4292b092";

// Predefined share classes
export const SHARE_CLASSES = [
  { name: "TIB2", address: "0x95262b5eed8051a286ae7f3f86cc6db07c152da2806ccff31df5a475c500b591" },
  { name: "BSFG325", address: "0xcca9bd387945b1daf7bb6cc6d68796318036ccc109be0ca31f6ae6d9c898d89e" },
  { name: "RODA1", address: "0xdbad8fb3e984a1bf2253eb5621a9e8371e3e52bcd4f54500e8a4059b6053198e" }
];

// Transaction function names
export const TRANSACTION_FUNCTIONS = {
  REQUEST_ISSUANCE: "request_issuance",
  REQUEST_REDEMPTION: "request_redemption",
  EXCHANGE_PRICE: "exchange_price",
  UPDATE_PRICE_PER_SHARE: "update_price_per_share"
} as const;

// Decimal precision constants
export const DECIMALS = {
  USDC: 6,
  DEFAULT_ASSET: 8,
  DISPLAY_PRECISION: 6
} as const; 