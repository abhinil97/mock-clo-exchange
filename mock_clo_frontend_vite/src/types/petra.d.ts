// Petra wallet type declarations
declare global {
  interface Window {
    aptos?: {
      connect: () => Promise<{ address: string; publicKey: string }>;
      disconnect: () => Promise<void>;
      account: () => Promise<{ address: string; publicKey: string }>;
      isConnected: () => Promise<boolean>;
      network: () => Promise<string>;
      signAndSubmitTransaction: (payload: {
        function: string;
        type_arguments: string[];
        arguments: unknown[];
      }) => Promise<{ hash: string }>;
      signTransaction: (transaction: unknown) => Promise<unknown>;
    };
  }
}

export {}; 