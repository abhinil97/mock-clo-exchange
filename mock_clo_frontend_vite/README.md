# Mock CLO Frontend - Vite Version

This is the Vite.js version of the Mock CLO Exchange frontend, migrated from Next.js.

## Features

- **Investment Management**: Invest USDC into share classes and receive share tokens
- **Withdrawal System**: Redeem share tokens back to USDC
- **Price Updates**: Admin functionality to update share class prices with enhanced granularity
- **Real-time Balances**: View USDC and share token balances
- **Wallet Integration**: Seamless Petra wallet connectivity
- **Modern UI**: Built with Tailwind CSS for responsive design

## Enhanced Pricing System

### 🚀 New Granular Pricing (v2)

The system now supports **enhanced pricing granularity** with up to 3 decimal places for more precise share valuations:

#### **Conversion Mechanism**
- **User Interface**: Simple decimal prices (e.g., `5.123` USDC per share)
- **Smart Contract**: Internal 1000x multiplier for precision (stores `5123`)
- **Calculations**: Automatic conversion between user-friendly and contract formats

#### **Formulas**
```
Issuance:  shares_minted = (underlying_amount / price_per_share) × 1000
Redemption: underlying_returned = (share_amount × price_per_share) ÷ 1000
```

#### **Example Calculations**
```
Price: 5.123 USDC per share
Investment: 10 USDC

1. Convert to contract format: 5.123 × 1000 = 5123
2. Calculate shares: (10,000,000 / 5123) × 1000 = 1,951,795,334 units
3. Display as tokens: 1,951,795,334 ÷ 10^6 = 1951.795334 tokens

Redemption: 1000 tokens
1. Convert to units: 1000 × 10^6 = 1,000,000,000 units  
2. Calculate USDC: (1,000,000,000 × 5123) ÷ 1000 = 5,123,000,000 units
3. Display as USDC: 5,123,000,000 ÷ 10^6 = 5123.0 USDC
```

#### **Benefits**
- ✨ **Enhanced Precision**: Support for fractional pricing (e.g., 5.123 vs 5.0)
- 🎯 **Accurate Valuations**: More precise share calculations
- 💰 **Better Economics**: Reduced rounding errors in large transactions
- 🔧 **Developer Friendly**: Automatic conversion handling

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

4. Preview production build:
   ```bash
   npm run preview
   ```

## Project Structure

```
src/
├── components/     # React components
├── pages/         # Page components
├── services/      # API and blockchain services
├── providers/     # React context providers
├── types/         # TypeScript type definitions
├── constants/     # Configuration constants
└── main.tsx       # Application entry point
```

## Migration Notes

This project has been migrated from Next.js to Vite.js with the following changes:

- Replaced Next.js app router with standard React components
- Updated build configuration for Vite
- Maintained all original functionality and styling
- Preserved Aptos SDK integration and wallet connectivity 

## Setup Instructions

### Prerequisites
- Node.js 18+ and pnpm
- Petra Wallet browser extension
- Aptos Mainnet connection

### Installation

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Start development server**:
   ```bash
   pnpm dev
   ```

3. **Build for production**:
   ```bash
   pnpm build
   ```

## Usage

### For Investors
1. **Connect Wallet**: Click "Connect Wallet" and approve Petra connection
2. **Invest**: Select share class, enter USDC amount, confirm transaction
3. **Monitor**: View real-time balances and conversion estimates
4. **Withdraw**: Redeem share tokens back to USDC (partial or full)

### For Administrators
1. **Create Share Classes**: Set up new investment products with precise pricing
2. **Update Prices**: Modify share class prices with 3-decimal precision
3. **Monitor System**: Track all share classes and investor activity

## Technical Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Aptos TypeScript SDK** for blockchain interaction

### Smart Contract Integration
- **Module**: `mock_clo_exchange` on Aptos Mainnet
- **Functions**: Create, invest, withdraw, price updates
- **Assets**: USDC and dynamic share class tokens

### Price Conversion Layer
- **Display Layer**: User-friendly decimal prices
- **Service Layer**: Automatic 1000x conversion
- **Contract Layer**: Integer arithmetic with enhanced precision

## Development

### Project Structure
```
src/
├── components/     # Reusable UI components
├── pages/         # Main application pages
├── services/      # Blockchain and calculation services
├── providers/     # React context providers
├── types/         # TypeScript definitions
└── constants/     # Configuration and addresses
```

### Key Services
- **AptosService**: Blockchain interaction with automatic price conversion
- **CalculationService**: Enhanced precision calculations with 1000x factor
- **AptosProvider**: Wallet and network management


## Configuration

Update `src/constants/addresses.ts` for different environments:
- Module addresses
- Share class definitions  
- Admin permissions
- Network settings

---

**Enhanced Pricing System**: Now supporting fractional USDC pricing with automatic precision handling! 🚀 