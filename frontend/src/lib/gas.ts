import type { PublicClient } from 'viem';

export async function getGasOverrides(publicClient: PublicClient) {
  const fees = await publicClient.estimateFeesPerGas();
  return {
    maxFeePerGas: (fees.maxFeePerGas ?? 0n) * 5n,
    maxPriorityFeePerGas: (fees.maxPriorityFeePerGas ?? 0n) * 5n,
  };
}
