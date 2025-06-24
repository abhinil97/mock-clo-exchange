import { WalletProps } from "../types/common";

export default function UpdatePrice({ walletAddress, aptBalance, usdcBalance }: WalletProps) {
  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
      <div className="p-4 rounded-md border border-gray-300">
        <h3 className="text-lg font-semibold mb-2">Update Price Component</h3>
        <p className="text-gray-600">Price update functionality will be implemented here.</p>
        <div className="mt-4 space-y-2">
          <p className="text-sm">Wallet: {walletAddress || "Not connected"}</p>
          <p className="text-sm">APT Balance: {aptBalance}</p>
          <p className="text-sm">USDC Balance: {usdcBalance}</p>
        </div>
      </div>
    </div>
  );
} 