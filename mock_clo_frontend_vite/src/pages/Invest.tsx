import { useState, useEffect } from "react";
import { useAptos } from "../providers/AptosProvider";
import { AptosService } from "../services/aptosService";
import { CalculationService } from "../services/calculationService";
import { MODULE_ADDRESS, USDC_METADATA, SHARE_CLASSES } from "../constants/addresses";
import { WalletProps, Currency, InputMode } from "../types/common";

// Window interface for Petra wallet is defined in page.tsx

export default function Invest({ walletAddress, aptBalance, usdcBalance }: WalletProps) {
  const [shareClassId, setShareClassId] = useState("");
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("USDC");
  const [isLoading, setIsLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("select");
  const [exchangePrice, setExchangePrice] = useState<string | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);

  const { aptos } = useAptos();
  const aptosService = new AptosService(aptos);

  // Fetch exchange price when shareClassId changes
  useEffect(() => {
    const fetchPrice = async () => {
      if (shareClassId) {
        setIsLoadingPrice(true);
        const price = await aptosService.fetchExchangePrice(shareClassId);
        setExchangePrice(price);
        setIsLoadingPrice(false);
      } else {
        setExchangePrice(null);
      }
    };

    fetchPrice();
  }, [shareClassId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInvest = async () => {
    setIsLoading(true);
    setError(null);
    setTransactionHash(null);

    try {
      // Validate inputs
      const addressError = CalculationService.validateShareClassAddress(shareClassId);
      if (addressError) {
        throw new Error(addressError);
      }

      const maxAmount = getMaxAmount();
      const amountError = CalculationService.validateInvestmentAmount(investmentAmount, maxAmount);
      if (amountError) {
        throw new Error(amountError);
      }

      // Submit transaction
      const txHash = await aptosService.submitInvestment(shareClassId, investmentAmount);
      setTransactionHash(txHash);
      
      // Reset form on success
      setInvestmentAmount("");
      setShareClassId("");
      
      // Show success message
      alert(`Investment successful! Transaction hash: ${txHash}`);
      
    } catch (error: unknown) {
      const errorMessage = AptosService.handleTransactionError(error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getMaxAmount = () => {
    return selectedCurrency === "APT" ? aptBalance : usdcBalance;
  };

  const getEstimatedShares = () => {
    return CalculationService.getEstimatedShares(investmentAmount, exchangePrice || "0");
  };

  const getInlineEstimate = () => {
    if (!investmentAmount || !exchangePrice || shareClassId === USDC_METADATA) return null;
    return CalculationService.getInlineConversionEstimate(investmentAmount, exchangePrice, "toShares");
  };

  const getShareClassName = (address: string) => {
    return CalculationService.getShareClassName(address);
  };

  const formatAddress = (address: string) => {
    return CalculationService.formatAddress(address, 10, 8);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
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
              <optgroup label="Assets">
                <option value={USDC_METADATA}>USDC</option>
              </optgroup>
            </select>
            {shareClassId && (
              <div className="text-xs text-gray-500 space-y-1">
                <p className="font-mono">
                  {formatAddress(shareClassId)}
                </p>
                {shareClassId !== USDC_METADATA && (
                  <div className="flex justify-between items-center">
                    <span>Exchange Rate:</span>
                    <span className="font-semibold">
                      {isLoadingPrice ? "Loading..." : 
                       exchangePrice ? `${exchangePrice} USDC per share` : "N/A"}
                    </span>
                  </div>
                )}
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
            {shareClassId && shareClassId !== USDC_METADATA && (
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between items-center">
                  <span>Exchange Rate:</span>
                  <span className="font-semibold">
                    {isLoadingPrice ? "Loading..." : 
                     exchangePrice ? `${exchangePrice} USDC per share` : "N/A"}
                  </span>
                </div>
              </div>
            )}
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
          onChange={(e) => setSelectedCurrency(e.target.value as Currency)}
          className="px-4 py-2 border border-gray-300 rounded-md bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          className="px-4 py-2 border border-gray-300 rounded-md bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={`Amount in ${selectedCurrency}`}
          disabled={isLoading}
        />
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => setInvestmentAmount(getMaxAmount())}
            className="text-xs text-blue-600 hover:text-blue-700"
            disabled={isLoading}
          >
            Use Max
          </button>
          {getInlineEstimate() && (
            <div className="text-xs text-gray-600">
              ≈ {getInlineEstimate()} shares
            </div>
          )}
        </div>
      </div>

      {/* Conversion Preview */}
      {exchangePrice && shareClassId !== USDC_METADATA && investmentAmount && (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
          <h4 className="text-sm font-medium mb-2 text-blue-800">Conversion Preview</h4>
          <div className="space-y-1 text-sm text-blue-700">
            <div className="flex justify-between">
              <span>Investment:</span>
              <span>{investmentAmount} USDC</span>
            </div>
            <div className="flex justify-between">
              <span>Rate:</span>
              <span>{exchangePrice} USDC per share</span>
            </div>
            <div className="border-t border-blue-300 pt-1 mt-1">
              <div className="flex justify-between font-medium">
                <span>You'll receive:</span>
                <span>{getEstimatedShares()} shares</span>
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
            <span className="font-mono text-xs">request_issuance</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Target:</span>
            <span className="font-medium">
              {getShareClassName(shareClassId) || "Not selected"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Amount:</span>
            <span>{investmentAmount || "0"} {selectedCurrency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Module:</span>
            <span className="font-mono text-xs truncate max-w-[200px]" title={MODULE_ADDRESS}>
              {CalculationService.formatAddress(MODULE_ADDRESS)}
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
              {CalculationService.formatAddress(transactionHash, 10, 8)}
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