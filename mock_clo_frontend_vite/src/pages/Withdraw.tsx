import { useState, useEffect } from "react";
import { useAptos } from "../providers/AptosProvider";
import { AptosService } from "../services/aptosService";
import { CalculationService } from "../services/calculationService";
import { MODULE_ADDRESS, USDC_METADATA, SHARE_CLASSES } from "../constants/addresses";
import { WalletProps, WithdrawType, InputMode } from "../types/common";

// Window interface for Petra wallet is defined in page.tsx

export default function Withdraw({ walletAddress }: WalletProps) {
  const [shareClassId, setShareClassId] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawType, setWithdrawType] = useState<WithdrawType>("full");
  const [inputMode, setInputMode] = useState<InputMode>("select");
  const [isLoading, setIsLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareClassBalance, setShareClassBalance] = useState<string>("0");
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [exchangePrice, setExchangePrice] = useState<string | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);

  const { aptos } = useAptos();
  const aptosService = new AptosService(aptos);



  // Helper functions using services
  const getEstimatedValue = () => {
    return CalculationService.getEstimatedWithdrawalValue(
      withdrawAmount, 
      exchangePrice || "0", 
      shareClassBalance, 
      withdrawType
    );
  };

  const getInlineEstimate = () => {
    if (!withdrawAmount || !exchangePrice || shareClassId === USDC_METADATA) return null;
    return CalculationService.getInlineConversionEstimate(withdrawAmount, exchangePrice, "toUSDC");
  };

  const getShareClassName = (address: string) => {
    return CalculationService.getShareClassName(address);
  };

  const formatAddress = (address: string) => {
    return CalculationService.formatAddress(address, 10, 8);
  };

  const formatBalance = (balance: string, assetAddress: string) => {
    return CalculationService.formatBalance(balance, assetAddress);
  };

  // Fetch balance and exchange price when shareClassId changes
  useEffect(() => {
    const fetchData = async () => {
      if (shareClassId && walletAddress) {
        setIsLoadingBalance(true);
        setIsLoadingPrice(true);
        
        const [balance, price] = await Promise.all([
          aptosService.fetchAssetBalance(walletAddress, shareClassId),
          aptosService.fetchExchangePrice(shareClassId)
        ]);
        
        setShareClassBalance(balance);
        setExchangePrice(price);
        setIsLoadingBalance(false);
        setIsLoadingPrice(false);
      } else {
        setShareClassBalance("0");
        setExchangePrice(null);
      }
    };

    fetchData();
  }, [shareClassId, walletAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleWithdraw = async () => {
    setIsLoading(true);
    setError(null);
    setTransactionHash(null);

    try {
      // Validate inputs
      const addressError = CalculationService.validateShareClassAddress(shareClassId);
      if (addressError) {
        throw new Error(addressError);
      }

      const finalWithdrawAmount = withdrawType === "full" ? shareClassBalance : withdrawAmount;
      const amountError = CalculationService.validateWithdrawalAmount(
        finalWithdrawAmount, 
        shareClassBalance, 
        withdrawType
      );
      if (amountError) {
        throw new Error(amountError);
      }

      // Submit transaction
      const txHash = await aptosService.submitWithdrawal(shareClassId, finalWithdrawAmount);
      setTransactionHash(txHash);
      
      // Reset form on success
      setWithdrawAmount("");
      setShareClassId("");
      
      // Show success message
      alert(`Withdrawal successful! Transaction hash: ${txHash}`);
      
    } catch (error: unknown) {
      const errorMessage = AptosService.handleTransactionError(error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
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
                <p 
                  className="font-mono cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors duration-200 px-1 py-0.5 rounded"
                  title={`Click to copy full share class address: ${shareClassId}`}
                  onClick={() => CalculationService.copyToClipboard(shareClassId, "Share Class Address")}
                >
                  {formatAddress(shareClassId)}
                </p>
                <div className="flex justify-between items-center">
                  <span>Your Balance:</span>
                  <span className="font-semibold">
                    {isLoadingBalance ? "Loading..." : formatBalance(shareClassBalance, shareClassId)}
                  </span>
                </div>
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
            {shareClassId && (
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between items-center">
                  <span>Your Balance:</span>
                  <span className="font-semibold">
                    {isLoadingBalance ? "Loading..." : formatBalance(shareClassBalance, shareClassId)}
                  </span>
                </div>
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
        )}
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
              onChange={(e) => setWithdrawType(e.target.value as WithdrawType)}
              className="mr-2"
              disabled={isLoading}
            />
            <span className="text-sm">Full Withdrawal</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="partial"
              checked={withdrawType === "partial"}
              onChange={(e) => setWithdrawType(e.target.value as WithdrawType)}
              className="mr-2"
              disabled={isLoading}
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
            className="px-4 py-2 border border-gray-300 rounded-md bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={`Max: ${formatBalance(shareClassBalance, shareClassId)}`}
            disabled={isLoading}
          />
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setWithdrawAmount(shareClassBalance)}
              className="text-xs text-blue-600 hover:text-blue-700"
              disabled={isLoading}
            >
              Use Max
            </button>
            {getInlineEstimate() && (
              <div className="text-xs text-gray-600">
                ≈ {getInlineEstimate()} USDC
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conversion Preview */}
      {exchangePrice && shareClassId !== USDC_METADATA && (withdrawType === "full" || withdrawAmount) && (
        <div className="bg-orange-50 border border-orange-200 p-3 rounded-md">
          <h4 className="text-sm font-medium mb-2 text-orange-800">Withdrawal Preview</h4>
          <div className="space-y-1 text-sm text-orange-700">
            <div className="flex justify-between">
              <span>Withdrawing:</span>
              <span>{withdrawType === "full" ? shareClassBalance : withdrawAmount} shares</span>
            </div>
            <div className="flex justify-between">
              <span>Rate:</span>
              <span>{exchangePrice} USDC per share</span>
            </div>
            <div className="border-t border-orange-300 pt-1 mt-1">
              <div className="flex justify-between font-medium">
                <span>You'll receive:</span>
                <span>{getEstimatedValue()} USDC</span>
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
            <span className="font-mono text-xs">request_redemption</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Target:</span>
            <span className="font-medium">
              {getShareClassName(shareClassId) || "Not selected"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Amount:</span>
            <span>
              {withdrawType === "full" ? shareClassBalance : (withdrawAmount || "0")} {shareClassId === USDC_METADATA ? "USDC" : "Tokens"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Module:</span>
            <span 
              className="font-mono text-xs truncate max-w-[200px] cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors duration-200 px-1 py-0.5 rounded"
              title={`Click to copy full module address: ${MODULE_ADDRESS}`}
              onClick={() => CalculationService.copyToClipboard(MODULE_ADDRESS, "Module Address")}
            >
              {CalculationService.formatAddress(MODULE_ADDRESS)}
            </span>
          </div>
        </div>
      </div>



      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
        <p className="text-xs text-yellow-800">
          <strong>Note:</strong> Withdrawals may be subject to lock-up periods or early withdrawal penalties based on the share class terms.
        </p>
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
            <span 
              className="font-mono text-xs ml-1 cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors duration-200 px-1 py-0.5 rounded"
              title={`Click to copy full transaction hash: ${transactionHash}`}
              onClick={() => CalculationService.copyToClipboard(transactionHash, "Transaction Hash")}
            >
              {CalculationService.formatAddress(transactionHash, 10, 8)}
            </span>
          </p>
        </div>
      )}

      <button
        onClick={handleWithdraw}
        disabled={!walletAddress || !shareClassId || (withdrawType === "partial" && (!withdrawAmount || Number(withdrawAmount) <= 0)) || isLoading}
        className="px-6 py-3 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {!walletAddress ? "Connect Wallet First" : isLoading ? "Processing..." : (withdrawType === "full" ? "Withdraw All" : "Withdraw Amount")}
      </button>
    </div>
  );
} 