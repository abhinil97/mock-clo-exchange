"use client";

import { useState } from "react";
import { useAptos } from "../providers/AptosProvider";

// Window interface for Petra wallet is defined in page.tsx

interface InvestProps {
  walletAddress: string | null;
  aptBalance: string;
  usdcBalance: string;
}

// Module address from the image
const MODULE_ADDRESS = "0xc09d9f882bcd2a8f109d806eae6aa3e1d8f630b18a196142bf6d9b2a4292b092";
const USDC_METADATA = "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b";

// Predefined share classes
const SHARE_CLASSES = [
  { name: "TIB2", address: "0x95262b5eed8051a286ae7f3f86cc6db07c152da2806ccff31df5a475c500b591" },
  { name: "BSFG325", address: "0xcca9bd387945b1daf7bb6cc6d68796318036ccc109be0ca31f6ae6d9c898d89e" },
  { name: "RODA1", address: "0xdbad8fb3e984a1bf2253eb5621a9e8371e3e52bcd4f54500e8a4059b6053198e" }
];

export default function Invest({ walletAddress, aptBalance, usdcBalance }: InvestProps) {
  const [shareClassId, setShareClassId] = useState("");
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<"APT" | "USDC">("USDC");
  const [isLoading, setIsLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"select" | "manual">("select");

  const { aptos } = useAptos();

  const handleInvest = async () => {
    if (!window.aptos) {
      setError("Petra wallet not found");
      return;
    }

    // Check if wallet is connected
    try {
      const isConnected = await window.aptos.isConnected();
      if (!isConnected) {
        setError("Please connect your wallet first");
        return;
      }
    } catch (e) {
      console.error("Error checking wallet connection:", e);
    }

    setIsLoading(true);
    setError(null);
    setTransactionHash(null);

    try {
      // Validate inputs
      if (!shareClassId || !shareClassId.startsWith("0x")) {
        throw new Error("Invalid share class address. Must start with 0x");
      }

      // Convert investment amount to smallest unit (6 decimals for USDC)
      const amountInSmallestUnit = Math.floor(Number(investmentAmount) * 1_000_000);
      console.log("Amount in smallest unit:", amountInSmallestUnit);

      // Build the transaction payload for Petra
      const payload = {
        function: `${MODULE_ADDRESS}::mock_clo_exchange::request_issuance`,
        type_arguments: [],
        arguments: [
          shareClassId, // The fungible asset metadata object address (e.g., USDC)
          amountInSmallestUnit.toString() // u64 amount as string
        ]
      };

      console.log("Transaction payload:", JSON.stringify(payload, null, 2));

      // Check network before submitting
      const currentNetwork = await window.aptos!.network();
      console.log("Current wallet network:", currentNetwork);
      
      if (!currentNetwork.toLowerCase().includes("mainnet")) {
        throw new Error("Please switch to Mainnet in your Petra wallet");
      }

      // Sign and submit via Petra wallet
      console.log("Requesting signature from Petra wallet...");
      const pendingTransaction = await window.aptos!.signAndSubmitTransaction(payload);
      
      console.log("Transaction submitted:", pendingTransaction.hash);
      setTransactionHash(pendingTransaction.hash);

      // Wait for transaction confirmation
      console.log("Waiting for transaction confirmation...");
      const executedTransaction = await aptos.waitForTransaction({ 
        transactionHash: pendingTransaction.hash 
      });

      console.log("Transaction confirmed:", executedTransaction);
      
      // Reset form on success
      setInvestmentAmount("");
      setShareClassId("");
      
      // Show success message
      alert(`Investment successful! Transaction hash: ${pendingTransaction.hash}`);
      
    } catch (error: unknown) {
      console.error("Transaction error:", error);
      const err = error as { code?: number; message?: string; stack?: string };
      console.error("Error details:", {
        code: err?.code,
        message: err?.message,
        stack: err?.stack,
        fullError: error
      });
      
      // Handle different error types
      if (err?.code === 4001) {
        setError("Transaction rejected by user");
      } else if (err?.code === 4100) {
        setError("The requested method is not supported by Petra");
      } else if (err?.message?.includes("Insufficient balance")) {
        setError("Insufficient balance for this transaction");
      } else if (err?.message) {
        setError(`Error: ${err.message}`);
      } else {
        setError("Transaction failed. Please check the console for details.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getMaxAmount = () => {
    return selectedCurrency === "APT" ? aptBalance : usdcBalance;
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mb-16">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium">
            Share Class / Asset Address
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setInputMode("select")}
              className={`px-3 py-1 text-xs rounded ${
                inputMode === "select" 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              disabled={isLoading}
            >
              Select
            </button>
            <button
              type="button"
              onClick={() => setInputMode("manual")}
              className={`px-3 py-1 text-xs rounded ${
                inputMode === "manual" 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              disabled={isLoading}
            >
              Manual
            </button>
          </div>
        </div>

        {inputMode === "select" ? (
          <>
            <select
              id="shareClassSelect"
              value={shareClassId}
              onChange={(e) => setShareClassId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            >
              <option value="">Select a share class...</option>
              <optgroup label="Share Classes">
                {SHARE_CLASSES.map((sc) => (
                  <option key={sc.address} value={sc.address}>
                    {sc.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Assets">
                <option value={USDC_METADATA}>USDC</option>
              </optgroup>
            </select>
            {shareClassId && (
              <p className="text-xs text-gray-500 font-mono">
                {shareClassId.slice(0, 10)}...{shareClassId.slice(-8)}
              </p>
            )}
          </>
        ) : (
          <>
            <input
              id="shareClassId"
              type="text"
              value={shareClassId}
              onChange={(e) => setShareClassId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="0x..."
              disabled={isLoading}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                Enter share class or fungible asset address
              </p>
              <button
                type="button"
                onClick={() => setShareClassId(USDC_METADATA)}
                className="text-xs text-blue-600 hover:text-blue-700"
                disabled={isLoading}
              >
                Use USDC
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="currency" className="text-sm font-medium">
          Select Currency
        </label>
        <select
          id="currency"
          value={selectedCurrency}
          onChange={(e) => setSelectedCurrency(e.target.value as "APT" | "USDC")}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading}
        >
          <option value="USDC">USDC</option>
          <option value="APT" disabled>APT (Coming Soon)</option>
        </select>
        <div className="text-xs text-gray-500">
          Available: {getMaxAmount()} {selectedCurrency}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="investmentAmount" className="text-sm font-medium">
          Investment Amount
        </label>
        <input
          id="investmentAmount"
          type="number"
          step={selectedCurrency === "APT" ? "0.0001" : "0.01"}
          value={investmentAmount}
          onChange={(e) => setInvestmentAmount(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={`Amount in ${selectedCurrency}`}
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={() => setInvestmentAmount(getMaxAmount())}
          className="text-xs text-blue-600 hover:text-blue-700 self-start"
          disabled={isLoading}
        >
          Use Max
        </button>
      </div>

      <div className="p-4 rounded-md">
        <h4 className="text-sm font-medium mb-2">Transaction Details</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Function:</span>
            <span className="font-mono text-xs">request_issuance</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Target:</span>
            <span className="font-medium">
              {shareClassId === USDC_METADATA ? "USDC" : 
               SHARE_CLASSES.find(sc => sc.address === shareClassId)?.name || 
               (shareClassId ? `${shareClassId.slice(0, 6)}...${shareClassId.slice(-4)}` : "Not selected")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Amount:</span>
            <span>{investmentAmount || "0"} {selectedCurrency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Module:</span>
            <span className="font-mono text-xs truncate max-w-[200px]" title={MODULE_ADDRESS}>
              {MODULE_ADDRESS.slice(0, 6)}...{MODULE_ADDRESS.slice(-4)}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {transactionHash && (
        <div className="bg-green-50 border border-green-200 p-3 rounded-md">
          <p className="text-sm text-green-800">
            Transaction submitted! Hash: 
            <span className="font-mono text-xs ml-1">
              {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
            </span>
          </p>
        </div>
      )}

      <button
        onClick={handleInvest}
        disabled={!walletAddress || !shareClassId || !investmentAmount || Number(investmentAmount) <= 0 || isLoading}
        className="px-6 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {!walletAddress ? "Connect Wallet First" : isLoading ? "Processing..." : "Submit Investment"}
      </button>
    </div>
  );
} 