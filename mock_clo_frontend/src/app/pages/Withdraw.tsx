"use client";

import { useState } from "react";

interface WithdrawProps {
  walletAddress: string | null;
  aptBalance: string;
  usdcBalance: string;
}

export default function Withdraw({ walletAddress, aptBalance, usdcBalance }: WithdrawProps) {
  const [shareClassId, setShareClassId] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawType, setWithdrawType] = useState<"partial" | "full">("full");

  // Mock data for demonstration - replace with actual data
  const mockInvestmentData = {
    invested: "10000",
    earned: "850",
    available: "10850",
    currency: "USDC"
  };

  const handleWithdraw = () => {
    console.log("Withdrawing:", { 
      shareClassId,
      withdrawAmount,
      withdrawType,
      walletAddress,
      aptBalance,
      usdcBalance
    });
    // Add your withdrawal logic here
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
      <div className="flex flex-col gap-2">
        <label htmlFor="shareClassId" className="text-sm font-medium">
          Share Class ID
        </label>
        <input
          id="shareClassId"
          type="text"
          value={shareClassId}
          onChange={(e) => setShareClassId(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter share class ID or address"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">
          Withdrawal Type
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="full"
              checked={withdrawType === "full"}
              onChange={(e) => setWithdrawType(e.target.value as "full" | "partial")}
              className="mr-2"
            />
            <span className="text-sm">Full Withdrawal</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="partial"
              checked={withdrawType === "partial"}
              onChange={(e) => setWithdrawType(e.target.value as "full" | "partial")}
              className="mr-2"
            />
            <span className="text-sm">Partial Withdrawal</span>
          </label>
        </div>
      </div>

      {withdrawType === "partial" && (
        <div className="flex flex-col gap-2">
          <label htmlFor="withdrawAmount" className="text-sm font-medium">
            Withdrawal Amount
          </label>
          <input
            id="withdrawAmount"
            type="number"
            step="0.01"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={`Max: ${mockInvestmentData.available} ${mockInvestmentData.currency}`}
          />
          <button
            type="button"
            onClick={() => setWithdrawAmount(mockInvestmentData.available)}
            className="text-xs text-blue-600 hover:text-blue-700 self-start"
          >
            Use Max
          </button>
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-md">
        <h4 className="text-sm font-medium mb-2">Investment Details</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Principal Invested:</span>
            <span>{mockInvestmentData.invested} {mockInvestmentData.currency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Interest Earned:</span>
            <span className="text-green-600">+{mockInvestmentData.earned} {mockInvestmentData.currency}</span>
          </div>
          <div className="border-t pt-1 mt-1">
            <div className="flex justify-between font-medium">
              <span>Total Available:</span>
              <span>{mockInvestmentData.available} {mockInvestmentData.currency}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
        <p className="text-xs text-yellow-800">
          <strong>Note:</strong> Withdrawals may be subject to lock-up periods or early withdrawal penalties based on the share class terms.
        </p>
      </div>

      <button
        onClick={handleWithdraw}
        disabled={!walletAddress || !shareClassId || (withdrawType === "partial" && (!withdrawAmount || Number(withdrawAmount) <= 0))}
        className="px-6 py-3 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {walletAddress ? (withdrawType === "full" ? "Withdraw All" : "Withdraw Amount") : "Connect Wallet First"}
      </button>
    </div>
  );
} 