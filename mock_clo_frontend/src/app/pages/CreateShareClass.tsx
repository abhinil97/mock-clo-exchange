"use client";

import { useState } from "react";
import { useAptos } from "../providers/AptosProvider";
import { AptosService } from "../services/aptosService";
import { CalculationService } from "../services/calculationService";
import { MODULE_ADDRESS, USDC_METADATA, ADMIN_ADDRESS } from "../constants/addresses";
import { WalletProps } from "../types/common";

export default function CreateShareClass({ walletAddress, aptBalance, usdcBalance }: WalletProps) {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [decimals, setDecimals] = useState("6");
  const [underlyingTokenAddr, setUnderlyingTokenAddr] = useState(USDC_METADATA);
  const [pricePerShare, setPricePerShare] = useState("");
  const [maxSupply, setMaxSupply] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { aptos } = useAptos();
  const aptosService = new AptosService(aptos);

  // Check if connected wallet is admin
  const isAdmin = walletAddress?.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

  // Debug information
  console.log("Debug Info:", {
    walletAddress,
    ADMIN_ADDRESS,
    isAdmin,
    walletLower: walletAddress?.toLowerCase(),
    adminLower: ADMIN_ADDRESS.toLowerCase(),
    isEqual: walletAddress?.toLowerCase() === ADMIN_ADDRESS.toLowerCase()
  });

  const handleCreateShareClass = async () => {
    setIsLoading(true);
    setError(null);
    setTransactionHash(null);

    try {
      // Validate inputs
      if (!name.trim()) {
        throw new Error("Please enter a share class name");
      }
      if (!symbol.trim()) {
        throw new Error("Please enter a symbol");
      }
      if (!pricePerShare || Number(pricePerShare) <= 0) {
        throw new Error("Please enter a valid price per share greater than 0");
      }
      if (!underlyingTokenAddr || !underlyingTokenAddr.startsWith("0x")) {
        throw new Error("Please enter a valid underlying token address");
      }
      if (!isAdmin) {
        throw new Error("Only admin can create share classes");
      }

      // Submit transaction
      const txHash = await aptosService.submitCreateShareClass(
        name,
        symbol,
        Number(decimals),
        underlyingTokenAddr,
        pricePerShare,
        maxSupply
      );
      setTransactionHash(txHash);
      
      // Reset form on success
      setName("");
      setSymbol("");
      setPricePerShare("");
      setMaxSupply("0");
      
      // Show success message
      alert(`Share class created successfully! Transaction hash: ${txHash}`);
      
    } catch (error: unknown) {
      const errorMessage = AptosService.handleTransactionError(error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
      {/* Debug Information */}
      {/* <div className="p-4 rounded-md border border-gray-300">
        <h4 className="text-sm font-medium mb-2">🐛 Debug Info</h4>
        <div className="space-y-1 text-xs">
          <div>Wallet Connected: {walletAddress ? "Yes" : "No"}</div>
          <div>Wallet Address: {walletAddress || "Not connected"}</div>
          <div>Admin Address: {ADMIN_ADDRESS}</div>
          <div>Is Admin: {isAdmin ? "Yes" : "No"}</div>
          <div>Inputs Disabled: {(!isAdmin) ? "Yes" : "No"}</div>
        </div>
      </div> */}

      {/* Admin Status Banner */}
      <div className={`p-4 rounded-md border ${
        isAdmin 
          ? "bg-green-50 border-green-200" 
          : "bg-red-50 border-red-200"
      }`}>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-800">
                ✅ Admin Access Granted
              </span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm font-medium text-red-800">
                ⚠️ Admin Access Required
              </span>
            </>
          )}
        </div>
        <p className="text-xs mt-1 text-gray-600">
          Admin Address: <span className="font-mono">{CalculationService.formatAddress(ADMIN_ADDRESS)}</span>
        </p>
        {walletAddress && (
          <p className="text-xs text-gray-600">
            Your Address: <span className="font-mono">{CalculationService.formatAddress(walletAddress)}</span>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-medium">
          Share Class Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., Tiberia Fund #3"
          disabled={isLoading}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="symbol" className="text-sm font-medium">
          Symbol
        </label>
        <input
          id="symbol"
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., TIB3"
          disabled={isLoading}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="decimals" className="text-sm font-medium">
          Decimals
        </label>
        <select
          id="decimals"
          value={decimals}
          onChange={(e) => setDecimals(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading}
        >
          <option value="6">6 (Standard)</option>
          <option value="8">8 (High Precision)</option>
          <option value="18">18 (Maximum)</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="underlyingTokenAddr" className="text-sm font-medium">
          Underlying Token Address
        </label>
        <input
          id="underlyingTokenAddr"
          type="text"
          value={underlyingTokenAddr}
          onChange={(e) => setUnderlyingTokenAddr(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          placeholder="0x..."
          disabled={isLoading}
        />
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500">
            Token that backs this share class
          </p>
          <button
            type="button"
            onClick={() => setUnderlyingTokenAddr(USDC_METADATA)}
            className="text-xs text-blue-600 hover:text-blue-700"
            disabled={isLoading}
          >
            Use USDC
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="pricePerShare" className="text-sm font-medium">
          Price Per Share (USDC)
        </label>
        <input
          id="pricePerShare"
          type="number"
          step="0.01"
          value={pricePerShare}
          onChange={(e) => setPricePerShare(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., 1.00"
          disabled={isLoading}
        />
        <p className="text-xs text-gray-500">
          Initial price for 1 share in underlying token units
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="maxSupply" className="text-sm font-medium">
          Max Supply
        </label>
        <input
          id="maxSupply"
          type="number"
          value={maxSupply}
          onChange={(e) => setMaxSupply(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="0 for unlimited"
          disabled={isLoading}
        />
        <p className="text-xs text-gray-500">
          Maximum number of shares that can be minted (0 = unlimited)
        </p>
      </div>

      {/* Creation Preview */}
      {name && symbol && pricePerShare && (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
          <h4 className="text-sm font-medium mb-2 text-blue-800">Share Class Preview</h4>
          <div className="space-y-1 text-sm text-blue-700">
            <div className="flex justify-between">
              <span>Name:</span>
              <span>{name}</span>
            </div>
            <div className="flex justify-between">
              <span>Symbol:</span>
              <span>{symbol}</span>
            </div>
            <div className="flex justify-between">
              <span>Decimals:</span>
              <span>{decimals}</span>
            </div>
            <div className="flex justify-between">
              <span>Price:</span>
              <span>{pricePerShare} USDC per share</span>
            </div>
            <div className="flex justify-between">
              <span>Max Supply:</span>
              <span>{maxSupply === "0" ? "Unlimited" : maxSupply}</span>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 rounded-md">
        <h4 className="text-sm font-medium mb-2">Transaction Details</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Function:</span>
            <span className="font-mono text-xs">create_share_class</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Name:</span>
            <span>{name || "Not set"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Symbol:</span>
            <span>{symbol || "Not set"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Underlying:</span>
            <span className="font-mono text-xs truncate max-w-[120px]" title={underlyingTokenAddr}>
              {CalculationService.formatAddress(underlyingTokenAddr)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Module:</span>
            <span className="font-mono text-xs truncate max-w-[200px]" title={MODULE_ADDRESS}>
              {CalculationService.formatAddress(MODULE_ADDRESS)}
            </span>
          </div>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
          <p className="text-xs text-yellow-800">
            <strong>Access Denied:</strong> Only the admin address can create share classes. 
            Please connect with the admin wallet to proceed.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {transactionHash && (
        <div className="bg-green-50 border border-green-200 p-3 rounded-md">
          <p className="text-sm text-green-800">
            Share class created! Hash: 
            <span className="font-mono text-xs ml-1">
              {CalculationService.formatAddress(transactionHash, 10, 8)}
            </span>
          </p>
        </div>
      )}

      <button
        onClick={handleCreateShareClass}
        disabled={!walletAddress || !name || !symbol || !pricePerShare || Number(pricePerShare) <= 0 || isLoading || !isAdmin}
        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {!walletAddress ? "Connect Wallet First" : 
         !isAdmin ? "Admin Access Required" :
         isLoading ? "Creating..." : "Create Share Class"}
      </button>
    </div>
  );
} 