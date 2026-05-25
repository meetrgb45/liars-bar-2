import { useCallback, useState } from 'react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { getClient } from '../lib/cofhe';
import {
  GAME_ADDRESS, GAME_ABI,
  DEVIL_GAME_ADDRESS, DEVIL_GAME_ABI,
  CHAOS_GAME_ADDRESS, CHAOS_GAME_ABI,
  REVOLVER_ADDRESS, REVOLVER_ABI,
} from '../lib/contracts';
import { useGameStore } from '../stores/gameStore';
import { getGasOverrides } from '../lib/gas';

export type SpinOutcome = 'click' | 'bang' | null;

function getContracts(mode: string) {
  if (mode === 'devil') return { address: DEVIL_GAME_ADDRESS, abi: DEVIL_GAME_ABI };
  if (mode === 'chaos') return { address: CHAOS_GAME_ADDRESS, abi: CHAOS_GAME_ABI };
  return { address: GAME_ADDRESS, abi: GAME_ABI };
}

export function useSpin() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const gameId = useGameStore((s) => s.gameId);
  const gameMode = useGameStore((s) => s.gameMode);
  const cofheReady = useGameStore((s) => s.cofheReady);
  const pendingSpinner = useGameStore((s) => s.pendingSpinner);
  const [spinning, setSpinning] = useState(false);
  const [outcome, setOutcome] = useState<SpinOutcome>(null);

  const isMySpinTurn = pendingSpinner?.toLowerCase() === address?.toLowerCase();

  const resolveSpin = useCallback(async () => {
    if (!publicClient || gameId === null || !cofheReady || spinning) return;
    const client = getClient();
    if (!client) return;
    const { address: gameAddr, abi } = getContracts(gameMode);

    setSpinning(true);
    setOutcome(null);
    try {
      const ctHash = await publicClient.readContract({
        address: REVOLVER_ADDRESS, abi: REVOLVER_ABI, functionName: 'getPendingCtHash', args: [BigInt(gameId)],
      }) as bigint;

      if (!ctHash || ctHash === 0n) { setSpinning(false); return; }

      const { decryptedValue, signature } = await client
        .decryptForTx(ctHash)
        .withoutPermit()
        .execute();

      await writeContractAsync({
        address: gameAddr, abi, functionName: 'publishSpinResult',
        args: [BigInt(gameId), ctHash, decryptedValue, signature],
        ...(await getGasOverrides(publicClient!)),
      });

      setOutcome(decryptedValue === 1n ? 'bang' : 'click');
    } catch (e: any) {
      console.error('Spin resolution failed:', e);
      if (e?.message?.includes('User rejected') || e?.message?.includes('denied')) {
        setSpinning(false);
        return;
      }
    }
    setSpinning(false);
  }, [publicClient, gameId, gameMode, cofheReady, spinning, writeContractAsync]);

  const clearOutcome = useCallback(() => setOutcome(null), []);

  return { resolveSpin, spinning, outcome, clearOutcome, isMySpinTurn };
}
