# Mock CLO Exchange

A Move-based Mock Collateralized Loan Obligation (CLO) exchange protocol built on Aptos blockchain. This protocol allows users to exchange underlying assets (like USDC) for share class tokens representing fractional ownership in a managed fund.

## Overview

The Mock CLO Exchange implements a simplified version of a CLO structure where:
- **Underlying Assets**: External fungible assets like USDC that investors deposit
- **Share Classes**: Protocol-issued tokens representing proportional ownership
- **Exchange Mechanism**: Fixed-price conversion between underlying assets and shares
- **Vault Management**: Protocol-controlled treasury holding underlying assets

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Mock CLO Exchange                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ ProtocolConfig  │    │ ShareClassData  │                │
│  │ - admin: addr   │    │ - underlying    │                │
│  │ - vault_cap     │    │ - price_per_share│               │
│  └─────────────────┘    │ - mint_cap      │                │
│                         │ - burn_cap      │                │
│                         │ - transfer_cap  │                │
│                         └─────────────────┘                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Structures

#### 1. ProtocolConfig
- **Purpose**: Global protocol configuration
- **Location**: Stored at `@mock_clo` address
- **Contains**: Admin address and vault signer capability

#### 2. ShareClassData
- **Purpose**: Configuration for each share class
- **Location**: Stored at each share class metadata object address
- **Contains**: Reference to underlying asset and share management capabilities

## Transaction Flows

### 1. Issuance Flow

```mermaid
sequenceDiagram
    participant Investor
    participant Protocol
    participant Vault
    participant ShareClass

    Investor->>Protocol: request_issuance(share_class, amount)
    Investor->>Protocol: withdraw(underlying_asset, amount)
    Protocol->>Vault: deposit(underlying_asset, amount)
    Protocol->>ShareClass: mint(shares, amount/price)
    Protocol->>Investor: deposit(shares)
    
    Note over Investor,ShareClass: Investor exchanges underlying for shares
```

### 2. Redemption Flow

```mermaid
sequenceDiagram
    participant Investor
    participant Protocol
    participant Vault
    participant ShareClass

    Investor->>Protocol: request_redemption(share_class, share_amount)
    Investor->>Protocol: withdraw(shares, share_amount)
    Protocol->>ShareClass: burn(shares)
    Vault->>Protocol: withdraw(underlying, share_amount * price)
    Protocol->>Investor: deposit(underlying)
    
    Note over Investor,ShareClass: Investor exchanges shares for underlying
```

## Usage Examples

### Creating a Share Class
```move
mock_clo_exchange::create_share_class(
    &admin,
    b"Class A Shares",      // name
    b"CLA",                 // symbol  
    6,                      // decimals
    usdc_metadata_addr,     // underlying asset
    10_000_000,            // price per share (10 USDC)
    0                      // unlimited supply
);
```

### Investor Issuance
```move
// Investor exchanges 100 USDC for 10 shares
mock_clo_exchange::request_issuance(
    &investor,
    share_class_object,
    100_000_000  // 100 USDC (6 decimals)
);
```

### Investor Redemption
```move
// Investor redeems 5 shares for 50 USDC
mock_clo_exchange::request_redemption(
    &investor,
    share_class_object,
    5  // 5 shares
);
```

## Testing

Run tests with:
```bash
aptos move test
```

## Deployment

1. **Initialize Protocol**
```bash
aptos move run --function-id <addr>::mock_clo_exchange::initialize_module
```

2. **Create Share Classes**
```bash
aptos move run --function-id <addr>::mock_clo_exchange::create_share_class \
  --args string:"Class A" string:"CLA" u8:6 address:<usdc_addr> u64:10000000 u128:0
```


## License

MIT License
