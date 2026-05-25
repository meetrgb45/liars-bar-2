import { useCallback, useState } from 'react';
import { usePublicClient, useWriteContract } from 'wagmi';
import { getClient } from '../lib/cofhe';
import {
  GAME_ADDRESS, GAME_ABI,
  DEVIL_GAME_ADDRESS, DEVIL_GAME_ABI,
  CHAOS_GAME_ADDRESS, CHAOS_GAME_ABI,
} from '../lib/contracts';
import { useGameStore } from '../stores/gameStore';
import { getGasOverrides } from '../lib/gas';

function getContracts(mode: string) {
  if (mode === 'devil') return { address: DEVIL_GAME_ADDRESS, abi: DEVIL_GAME_ABI };
  if (mode === 'chaos') return { address: CHAOS_GAME_ADDRESS, abi: CHAOS_GAME_ABI };
  return { address: GAME_ADDRESS, abi: GAME_ABI };
}

export function useChallenge() {
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const gameId = useGameStore((s) => s.gameId);
  const gameMode = useGameStore((s) => s.gameMode);
  const cofheReady = useGameStore((s) => s.cofheReady);
  const [resolving, setResolving] = useState(false);

  const resolveChallenge = useCallback(async () => {
    if (!publicClient || gameId === null || !cofheReady) return;
    const client = getClient();
    if (!client) return;
    const { address, abi } = getContracts(gameMode);

    setResolving(true);
    try {
      // Read pendingCtHash from contract
      const ctHash = await publicClient.readContract({
        address, abi, functionName: 'getPendingCtHash', args: [BigInt(gameId)],
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
        address, abi, functionName: 'publishChallengeResult',
        args: [BigInt(gameId), ctHash, decryptedValue, signature], ...gas,
      });
      console.log('[challenge] published!');

      // Now decrypt individual cards for reveal
      try {
        const revealHashes = await publicClient.readContract({
          address, abi, functionName: 'getRevealCtHashes', args: [BigInt(gameId)],
        }) as bigint[];

        if (revealHashes && revealHashes.length > 0) {
          console.log('[challenge] decrypting', revealHashes.length, 'cards for reveal...');
          await new Promise(r => setTimeout(r, 3000));

          const cardResults: bigint[] = [];
          const cardSigs: `0x${string}`[] = [];
          const cardHashes: bigint[] = [];

          for (const h of revealHashes) {
            const { decryptedValue: val, signature: sig } = await client
              .decryptForTx(h)
              .withoutPermit()
              .execute();
            cardHashes.push(h);
            cardResults.push(val);
            cardSigs.push(sig);
          }

          const gas2 = await getGasOverrides(publicClient);
          await writeContractAsync({
            address, abi, functionName: 'publishCardReveal',
            args: [BigInt(gameId), cardHashes, cardResults, cardSigs], ...gas2,
          });

          // Store in local state
          useGameStore.getState().setRevealedCards(cardResults.map(v => Number(v)));
          console.log('[challenge] cards revealed:', cardResults.map(v => Number(v)));
        }
      } catch (revealErr) {
        console.error('[challenge] card reveal failed (non-critical):', revealErr);
      }
    } catch (e) {
      console.error('[challenge] resolution failed:', e);
    }
    setResolving(false);
  }, [publicClient, gameId, cofheReady, writeContractAsync]);

  return { resolveChallenge, resolving };
}
