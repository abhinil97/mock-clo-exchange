import { useState } from "react";
import { useAptos } from "../providers/AptosProvider";
import { AptosService } from "../services/aptosService";
import { CalculationService } from "../services/calculationService";
import { USDC_METADATA, ADMIN_ADDRESS } from "../constants/addresses";
import { WalletProps } from "../types/common";

export default function CreateShareClass({ walletAddress }: WalletProps) {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [underlyingTokenAddr] = useState(USDC_METADATA);
  const [pricePerShare, setPricePerShare] = useState("");
  const [maxSupply, setMaxSupply] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { aptos } = useAptos();
  const aptosService = new AptosService(aptos);

  // Check if connected wallet is admin
  const isAdmin = walletAddress?.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

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
        6,
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
      </div>

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