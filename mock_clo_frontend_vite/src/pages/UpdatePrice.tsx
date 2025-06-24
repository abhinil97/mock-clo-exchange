import { useState, useEffect } from "react";
import { useAptos } from "../providers/AptosProvider";
import { AptosService } from "../services/aptosService";
import { CalculationService } from "../services/calculationService";
import { MODULE_ADDRESS, SHARE_CLASSES, ADMIN_ADDRESS } from "../constants/addresses";
import { WalletProps, InputMode } from "../types/common";

export default function UpdatePrice({ walletAddress }: WalletProps) {
  const [shareClassId, setShareClassId] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("select");
  const [isLoading, setIsLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<string | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);

  const { aptos } = useAptos();
  const aptosService = new AptosService(aptos);

  // Check if connected wallet is admin
  const isAdmin = walletAddress?.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

  // Fetch current price when shareClassId changes
  useEffect(() => {
    const fetchPrice = async () => {
      if (shareClassId) {
        setIsLoadingPrice(true);
        const price = await aptosService.fetchExchangePrice(shareClassId);
        setCurrentPrice(price);
        setIsLoadingPrice(false);
      } else {
        setCurrentPrice(null);
      }
    };

    fetchPrice();
  }, [shareClassId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdatePrice = async () => {
    setIsLoading(true);
    setError(null);
    setTransactionHash(null);

    try {
      // Validate inputs
      const addressError = CalculationService.validateShareClassAddress(shareClassId);
      if (addressError) {
        throw new Error(addressError);
      }

      if (!newPrice || Number(newPrice) <= 0) {
        throw new Error("Please enter a valid price greater than 0");
      }

      if (!isAdmin) {
        throw new Error("Only admin can update prices");
      }

      // Submit transaction
      const txHash = await aptosService.submitPriceUpdate(shareClassId, newPrice);
      setTransactionHash(txHash);
      
      // Reset form on success
      setNewPrice("");
      
      // Refresh current price
      const updatedPrice = await aptosService.fetchExchangePrice(shareClassId);
      setCurrentPrice(updatedPrice);
      
      // Show success message
      alert(`Price update successful! Transaction hash: ${txHash}`);
      
    } catch (error: unknown) {
      const errorMessage = AptosService.handleTransactionError(error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getShareClassName = (address: string) => {
    return CalculationService.getShareClassName(address);
  };

  const formatAddress = (address: string) => {
    return CalculationService.formatAddress(address, 10, 8);
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
              className="px-4 py-2 border border-gray-300 rounded-md bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            </select>
            {shareClassId && (
              <div className="text-xs text-gray-500 space-y-1">
                <p className="font-mono">
                  {formatAddress(shareClassId)}
                </p>
                <div className="flex justify-between items-center">
                  <span>Current Price:</span>
                  <span className="font-semibold">
                    {isLoadingPrice ? "Loading..." : 
                     currentPrice ? `${currentPrice} USDC per share` : "N/A"}
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <input
              id="shareClassId"
              type="text"
              value={shareClassId}
              onChange={(e) => setShareClassId(e.target.value)}
                             className="px-4 py-2 border border-gray-300 rounded-md bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="0x..."
              disabled={isLoading}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                Enter share class fungible asset address
              </p>
            </div>
            {shareClassId && (
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between items-center">
                  <span>Current Price:</span>
                  <span className="font-semibold">
                    {isLoadingPrice ? "Loading..." : 
                     currentPrice ? `${currentPrice} USDC per share` : "N/A"}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="newPrice" className="text-sm font-medium">
          New Price (USDC per share)
        </label>
        <input
          id="newPrice"
          type="number"
          step="0.001"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter new price..."
          disabled={isLoading || !isAdmin}
        />
        <div className="text-xs text-gray-500">
          <p>🔧 System uses 1000x internal multiplier for granular pricing</p>
        </div>
        {currentPrice && newPrice && (
          <div className="text-xs text-gray-600">
            Change: {currentPrice} → {newPrice} USDC per share
            {Number(newPrice) > Number(currentPrice) ? (
              <span className="text-green-600 ml-1">↗ +{(Number(newPrice) - Number(currentPrice)).toFixed(3)}</span>
            ) : Number(newPrice) < Number(currentPrice) ? (
              <span className="text-red-600 ml-1">↘ -{(Number(currentPrice) - Number(newPrice)).toFixed(3)}</span>
            ) : (
              <span className="text-gray-600 ml-1">→ No change</span>
            )}
          </div>
        )}
      </div>

      {/* Price Update Preview */}
      {shareClassId && newPrice && currentPrice && (
        <div className="bg-purple-50 border border-purple-200 p-3 rounded-md">
          <h4 className="text-sm font-medium mb-2 text-purple-800">Price Update Preview</h4>
          <div className="space-y-1 text-sm text-purple-700">
            <div className="flex justify-between">
              <span>Share Class:</span>
              <span>{getShareClassName(shareClassId)}</span>
            </div>
            <div className="flex justify-between">
              <span>Current Price:</span>
              <span>{currentPrice} USDC</span>
            </div>
            <div className="flex justify-between">
              <span>New Price:</span>
              <span>{newPrice} USDC</span>
            </div>
            <div className="border-t border-purple-300 pt-1 mt-1">
              <div className="flex justify-between font-medium">
                <span>Change:</span>
                <span>
                  {Number(newPrice) > Number(currentPrice) ? "+" : ""}
                  {(Number(newPrice) - Number(currentPrice)).toFixed(3)} USDC
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 rounded-md">
        <h4 className="text-sm font-medium mb-2">Transaction Details</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Function:</span>
            <span className="font-mono text-xs">update_price_per_share</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Target:</span>
            <span className="font-medium">
              {getShareClassName(shareClassId) || "Not selected"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">New Price:</span>
            <span>{newPrice || "0"} USDC</span>
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
            <strong>Access Denied:</strong> Only the admin address can update share class prices. 
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
            Price update submitted! Hash: 
            <span className="font-mono text-xs ml-1">
              {CalculationService.formatAddress(transactionHash, 10, 8)}
            </span>
          </p>
        </div>
      )}

      <button
        onClick={handleUpdatePrice}
        disabled={!walletAddress || !shareClassId || !newPrice || Number(newPrice) <= 0 || isLoading || !isAdmin}
        className="px-6 py-3 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {!walletAddress ? "Connect Wallet First" : 
         !isAdmin ? "Admin Access Required" :
         isLoading ? "Processing..." : "Update Price"}
      </button>
    </div>
  );
} 