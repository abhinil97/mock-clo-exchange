# Mock CLO Frontend - Vite Version

This is the Vite.js version of the Mock CLO Exchange frontend, migrated from Next.js.

## Features

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Aptos SDK** integration for blockchain interactions
- **Petra Wallet** support

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