import type { PublicClient } from 'viem';

// Arb Sepolia baseFee hovers around 0.02 gwei (20_000_000 wei)
// RPCs return stale data, so we set a safe minimum floor
const MIN_MAX_FEE = 50_000_000n; // 0.05 gwei — always above baseFee

export async function getGasOverrides(publicClient: PublicClient) {
  try {
    const fees = await publicClient.estimateFeesPerGas();
    const estimated = (fees.maxFeePerGas ?? 0n) * 2n;
    return {
      maxFeePerGas: estimated > MIN_MAX_FEE ? estimated : MIN_MAX_FEE,
      maxPriorityFeePerGas: 1_000_000n,
    };
  } catch {
    return {
      maxFeePerGas: MIN_MAX_FEE,
      maxPriorityFeePerGas: 1_000_000n,
    };
  }
}
