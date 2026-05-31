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
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const ctHash = await publicClient.readContract({
          address, abi, functionName: 'getPendingCtHash', args: [BigInt(gameId)],
        }) as bigint;

        if (!ctHash || ctHash === 0n) { setResolving(false); return; }

        if (attempt === 0) await new Promise(r => setTimeout(r, 5000));
        else await new Promise(r => setTimeout(r, 3000));

        const { decryptedValue, signature } = await client
          .decryptForTx(ctHash)
          .withoutPermit()
          .execute();

        const gas = await getGasOverrides(publicClient);
        await writeContractAsync({
          address, abi, functionName: 'publishChallengeResult',
          args: [BigInt(gameId), ctHash, decryptedValue, signature], ...gas,
        });
        console.log('[challenge] published!');

        // Decrypt individual cards for reveal
        try {
          const revealHashes = await publicClient.readContract({
            address, abi, functionName: 'getRevealCtHashes', args: [BigInt(gameId)],
          }) as bigint[];

          if (revealHashes && revealHashes.length > 0) {
            await new Promise(r => setTimeout(r, 3000));
            const cardHashes: bigint[] = [];
            const cardResults: bigint[] = [];
            const cardSigs: `0x${string}`[] = [];

            for (const h of revealHashes) {
              for (let cardAttempt = 0; cardAttempt < 3; cardAttempt++) {
                try {
                  const { decryptedValue: val, signature: sig } = await client.decryptForTx(h).withoutPermit().execute();
                  cardHashes.push(h);
                  cardResults.push(val);
                  cardSigs.push(sig);
                  break;
                } catch {
                  if (cardAttempt < 2) await new Promise(r => setTimeout(r, 2000));
                }
              }
            }

            if (cardHashes.length > 0) {
              const gas2 = await getGasOverrides(publicClient);
              await writeContractAsync({
                address, abi, functionName: 'publishCardReveal',
                args: [BigInt(gameId), cardHashes, cardResults, cardSigs], ...gas2,
              });
              useGameStore.getState().setRevealedCards(cardResults.map(v => Number(v)));
            }
          }
        } catch (revealErr) {
          console.warn('[challenge] card reveal failed:', revealErr);
        }

        setResolving(false);
        return;
      } catch (e: any) {
        const msg = e?.message || '';
        if (/User rejected|denied/i.test(msg)) { setResolving(false); return; }
        console.warn(`[challenge] attempt ${attempt + 1} failed:`, msg);
        if (attempt < 3) await new Promise(r => setTimeout(r, 3000));
      }
    }
    setResolving(false);
  }, [publicClient, gameId, gameMode, cofheReady, writeContractAsync]);

  return { resolveChallenge, resolving };
}
