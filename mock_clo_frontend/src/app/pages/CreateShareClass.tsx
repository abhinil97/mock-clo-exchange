"use client";

import { useState } from "react";

interface CreateShareClassProps {
  walletAddress: string | null;
  aptBalance: string;
  usdcBalance: string;
}

export default function CreateShareClass({ walletAddress, aptBalance, usdcBalance }: CreateShareClassProps) {
  const [className, setClassName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [maturityPeriod, setMaturityPeriod] = useState("");

  const handleCreateShareClass = () => {
    console.log("Creating share class:", { 
      className,
      targetAmount,
      interestRate,
      maturityPeriod,
      walletAddress,
      aptBalance,
      usdcBalance
    });
    // Add your share class creation logic here
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
      <div className="flex flex-col gap-2">
        <label htmlFor="className" className="text-sm font-medium">
          Share Class Name
        </label>
        <input
          id="className"
          type="text"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., Senior Tranche A"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="targetAmount" className="text-sm font-medium">
          Target Amount (USDC)
        </label>
        <input
          id="targetAmount"
          type="number"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., 1000000"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="interestRate" className="text-sm font-medium">
          Interest Rate (% per annum)
        </label>
        <input
          id="interestRate"
          type="number"
          step="0.01"
          value={interestRate}
          onChange={(e) => setInterestRate(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., 8.5"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="maturityPeriod" className="text-sm font-medium">
          Maturity Period (days)
        </label>
        <input
          id="maturityPeriod"
          type="number"
          value={maturityPeriod}
          onChange={(e) => setMaturityPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., 365"
        />
      </div>

      <button
        onClick={handleCreateShareClass}
        disabled={!walletAddress || !className || !targetAmount || !interestRate || !maturityPeriod}
        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {walletAddress ? "Create Share Class" : "Connect Wallet First"}
      </button>
    </div>
  );
} 