import type { PublicClient } from 'viem';
import { parseGwei } from 'viem';

const ARB_MIN_MAX_FEE = parseGwei('0.1');
const ARB_MIN_PRIORITY = parseGwei('0.01');

function maxBigInt(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

export async function getGasOverrides(publicClient: PublicClient) {
  try {
    const fees = await publicClient.estimateFeesPerGas();
    return {
      maxFeePerGas: maxBigInt((fees.maxFeePerGas ?? 0n) * 2n, ARB_MIN_MAX_FEE),
      maxPriorityFeePerGas: maxBigInt((fees.maxPriorityFeePerGas ?? 0n) * 2n, ARB_MIN_PRIORITY),
    };
  } catch {
    return { maxFeePerGas: ARB_MIN_MAX_FEE, maxPriorityFeePerGas: ARB_MIN_PRIORITY };
  }
}

export async function getHeavyGasOverrides(publicClient: PublicClient, gasLimit = 8_000_000n) {
  try {
    const fees = await publicClient.estimateFeesPerGas();
    return {
      maxFeePerGas: maxBigInt((fees.maxFeePerGas ?? 0n) * 5n, parseGwei('0.2')),
      maxPriorityFeePerGas: maxBigInt((fees.maxPriorityFeePerGas ?? 0n) * 5n, parseGwei('0.05')),
      gas: gasLimit,
    };
  } catch {
    return { maxFeePerGas: parseGwei('0.2'), maxPriorityFeePerGas: parseGwei('0.05'), gas: gasLimit };
  }
}
