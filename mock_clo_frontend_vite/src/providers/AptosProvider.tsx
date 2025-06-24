import React, { createContext, useContext } from "react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

// Create the context
interface AptosContextType {
  aptos: Aptos;
  network: Network;
}

const AptosContext = createContext<AptosContextType | undefined>(undefined);

// Provider component
export function AptosProvider({ children }: { children: React.ReactNode }) {
  // Initialize Aptos client
  const network = Network.MAINNET;
  const config = new AptosConfig({ network });
  const aptos = new Aptos(config);

  console.log("Aptos SDK initialized with network:", network);

  return (
    <AptosContext.Provider value={{ aptos, network }}>
      {children}
    </AptosContext.Provider>
  );
}

// Custom hook to use the Aptos context
export function useAptos() {
  const context = useContext(AptosContext);
  if (!context) {
    throw new Error("useAptos must be used within an AptosProvider");
  }
  return context;
} 