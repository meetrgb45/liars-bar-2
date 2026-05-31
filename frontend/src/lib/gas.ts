import type { PublicClient } from 'viem';

/**
 * Gas overrides for Arb Sepolia.
 * Most txs work fine without overrides (wallet estimates correctly).
 * Only FHE-heavy txs (startGame, publishChallengeResult) need a boost.
 */
export async function getGasOverrides(publicClient: PublicClient) {
  try {
    const fees = await publicClient.estimateFeesPerGas();
    // Use 2x for fee (enough to clear baseFee fluctuations)
    return {
      maxFeePerGas: (fees.maxFeePerGas ?? 0n) * 2n,
      maxPriorityFeePerGas: (fees.maxPriorityFeePerGas ?? 0n) * 2n,
    };
  } catch {
    return {};
  }
}

/**
 * For heavy FHE transactions (startGame with 200+ FHE ops).
 * Uses higher multiplier to avoid underestimation.
 */
export async function getHeavyGasOverrides(publicClient: PublicClient) {
  try {
    const fees = await publicClient.estimateFeesPerGas();
    return {
      maxFeePerGas: (fees.maxFeePerGas ?? 0n) * 5n,
      maxPriorityFeePerGas: (fees.maxPriorityFeePerGas ?? 0n) * 5n,
    };
  } catch {
    return {};
  }
}
