import { useCallback, useRef } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { FheTypes } from '@cofhe/sdk';
import { getClient } from '../lib/cofhe';
import { DECK_ADDRESS, DECK_ABI } from '../lib/contracts';
import { useGameStore } from '../stores/gameStore';

const BACKOFF = [3000, 5000, 8000, 10000, 15000, 20000, 25000];

async function decryptWithRetry(client: any, ctHash: bigint): Promise<number | null> {
  for (let attempt = 0; attempt <= BACKOFF.length; attempt++) {
    try {
      const result = await client.decryptForView(ctHash, FheTypes.Uint8).withPermit().execute();
      return Number(result);
    } catch (err: any) {
      const msg = err?.message || String(err);
      const isTransient = /sealOutput|HTTP\s*[3-5]\d{2}|Failed to fetch|NetworkError|ETIMEDOUT|not found|not ready/i.test(msg);
      console.warn(`[decrypt] attempt ${attempt + 1} failed:`, msg);
      if (isTransient && attempt < BACKOFF.length) {
        await new Promise(r => setTimeout(r, BACKOFF[attempt]));
        continue;
      }
      console.error('[decrypt] giving up on hash:', ctHash.toString());
      return null;
    }
  }
  return null;
}

export function useMyHand() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const gameId = useGameStore((s) => s.gameId);
  const round = useGameStore((s) => s.round);
  const setMyHand = useGameStore((s) => s.setMyHand);
  const cofheReady = useGameStore((s) => s.cofheReady);
  const decryptingRef = useRef(false);

  const decryptHand = useCallback(async () => {
    if (!address || !publicClient || gameId === null || !cofheReady) {
      console.log('[useMyHand] not ready:', { address: !!address, publicClient: !!publicClient, gameId, cofheReady });
      return;
    }
    if (decryptingRef.current) { console.log('[useMyHand] already decrypting'); return; }
    decryptingRef.current = true;

    const client = getClient();
    if (!client) { console.error('[useMyHand] no cofhe client'); decryptingRef.current = false; return; }

    try {
      const deckGameId = BigInt(gameId) * 100n + BigInt(round);
      console.log('[useMyHand] deckGameId:', deckGameId.toString(), 'player:', address);

      const hashes = await publicClient.readContract({
        address: DECK_ADDRESS, abi: DECK_ABI, functionName: 'getHandHashes', args: [deckGameId, address],
      }) as bigint[];
      console.log('[useMyHand] hashes:', hashes.map(h => h.toString()));

      // Check if hashes are all zero (cards not dealt yet)
      if (hashes.every(h => h === 0n)) {
        console.log('[useMyHand] no cards dealt yet');
        decryptingRef.current = false;
        return;
      }

      // Wait for FHE network sync (threshold network needs time to process)
      console.log('[useMyHand] waiting 8s for FHE network sync...');
      await new Promise(r => setTimeout(r, 8000));

      // Recreate permit fresh before decrypting
      console.log('[useMyHand] creating fresh permit...');
      await client.permits.getOrCreateSelfPermit();

      const hand: (number | null)[] = [];
      for (let i = 0; i < hashes.length; i++) {
        if (hashes[i] === 0n) { hand.push(null); continue; }
        console.log(`[useMyHand] decrypting card ${i}, hash:`, hashes[i].toString());
        const val = await decryptWithRetry(client, hashes[i]);
        hand.push(val);
        console.log(`[useMyHand] card ${i} =`, val);
      }
      setMyHand(hand);
    } catch (e) {
      console.error('[useMyHand] error:', e);
    }
    decryptingRef.current = false;
  }, [address, publicClient, gameId, round, cofheReady, setMyHand]);

  return { decryptHand };
}
