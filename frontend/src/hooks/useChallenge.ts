import { useCallback, useState } from 'react';
import { usePublicClient, useWriteContract } from 'wagmi';
import { getClient } from '../lib/cofhe';
import { GAME_ADDRESS, GAME_ABI } from '../lib/contracts';
import { useGameStore } from '../stores/gameStore';
import { getGasOverrides } from '../lib/gas';

export function useChallenge() {
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const gameId = useGameStore((s) => s.gameId);
  const cofheReady = useGameStore((s) => s.cofheReady);
  const [resolving, setResolving] = useState(false);

  const resolveChallenge = useCallback(async () => {
    if (!publicClient || gameId === null || !cofheReady) return;
    const client = getClient();
    if (!client) return;

    setResolving(true);
    try {
      // Read pendingCtHash from contract
      const ctHash = await publicClient.readContract({
        address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'getPendingCtHash', args: [BigInt(gameId)],
      }) as bigint;

      console.log('[challenge] ctHash:', ctHash.toString());
      if (!ctHash || ctHash === 0n) {
        console.log('[challenge] no pending ctHash');
        setResolving(false);
        return;
      }

      // Wait for FHE network to process
      console.log('[challenge] waiting 5s for FHE sync...');
      await new Promise(r => setTimeout(r, 5000));

      // Decrypt via CoFHE threshold network (public — no permit needed)
      console.log('[challenge] decrypting...');
      const { decryptedValue, signature } = await client
        .decryptForTx(ctHash)
        .withoutPermit()
        .execute();

      console.log('[challenge] result:', decryptedValue.toString(), '(1=allValid, 0=lie)');

      // Publish result on-chain
      const gas = await getGasOverrides(publicClient);
      await writeContractAsync({
        address: GAME_ADDRESS, abi: GAME_ABI, functionName: 'publishChallengeResult',
        args: [BigInt(gameId), ctHash, decryptedValue, signature], ...gas,
      });
      console.log('[challenge] published!');
    } catch (e) {
      console.error('[challenge] resolution failed:', e);
    }
    setResolving(false);
  }, [publicClient, gameId, cofheReady, writeContractAsync]);

  return { resolveChallenge, resolving };
}
