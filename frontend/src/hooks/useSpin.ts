import { useCallback, useState } from 'react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { getClient } from '../lib/cofhe';
import { GAME_ADDRESS, GAME_ABI, REVOLVER_ADDRESS, REVOLVER_ABI } from '../lib/contracts';
import { useGameStore } from '../stores/gameStore';
import { getGasOverrides } from '../lib/gas';

export type SpinOutcome = 'click' | 'bang' | null;

export function useSpin() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const gameId = useGameStore((s) => s.gameId);
  const cofheReady = useGameStore((s) => s.cofheReady);
  const pendingSpinner = useGameStore((s) => s.pendingSpinner);
  const [spinning, setSpinning] = useState(false);
  const [outcome, setOutcome] = useState<SpinOutcome>(null);

  const isMySpinTurn = pendingSpinner?.toLowerCase() === address?.toLowerCase();

  const resolveSpin = useCallback(async () => {
    if (!publicClient || gameId === null || !cofheReady) return;
    const client = getClient();
    if (!client) return;

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
        address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'publishSpinResult',
        args: [BigInt(gameId), ctHash, decryptedValue, signature],
        ...(await getGasOverrides(publicClient!)),
      });

      setOutcome(decryptedValue === 1n ? 'bang' : 'click');

      // Check for double spin second chamber
      const doubleCt = await publicClient.readContract({
        address: REVOLVER_ADDRESS, abi: REVOLVER_ABI, functionName: 'getPendingDoubleCt', args: [BigInt(gameId)],
      }) as bigint;

      if (doubleCt && doubleCt !== 0n && decryptedValue === 0n) {
        // First was safe, resolve second
        const res2 = await client.decryptForTx(doubleCt).withoutPermit().execute();
        await writeContractAsync({
          address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'publishDoubleSpinResult',
          args: [BigInt(gameId), doubleCt, res2.decryptedValue, res2.signature],
          ...(await getGasOverrides(publicClient!)),
        });
        setOutcome(res2.decryptedValue === 1n ? 'bang' : 'click');
      }
    } catch (e) {
      console.error('Spin resolution failed:', e);
    }
    setSpinning(false);
  }, [publicClient, gameId, cofheReady, writeContractAsync]);

  const activateDoubleSpin = useCallback(async () => {
    if (gameId === null || !publicClient) return;
    const gas = await getGasOverrides(publicClient);
    await writeContractAsync({
      address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'useDoubleSpin', args: [BigInt(gameId)], ...gas,
    });
  }, [gameId, publicClient, writeContractAsync]);

  const clearOutcome = useCallback(() => setOutcome(null), []);

  return { resolveSpin, activateDoubleSpin, spinning, outcome, clearOutcome, isMySpinTurn };
}
