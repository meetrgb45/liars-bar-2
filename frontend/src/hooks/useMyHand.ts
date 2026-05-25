import { useCallback, useRef } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { FheTypes } from '@cofhe/sdk';
import { getClient } from '../lib/cofhe';
import { DECK_ADDRESS, DECK_ABI, DEVIL_DECK_ADDRESS, DEVIL_DECK_ABI, CHAOS_DECK_ADDRESS, CHAOS_DECK_ABI } from '../lib/contracts';
import { useGameStore } from '../stores/gameStore';

function getDeckContract(mode: string) {
  if (mode === 'devil') return { address: DEVIL_DECK_ADDRESS, abi: DEVIL_DECK_ABI };
  if (mode === 'chaos') return { address: CHAOS_DECK_ADDRESS, abi: CHAOS_DECK_ABI };
  return { address: DECK_ADDRESS, abi: DECK_ABI };
}

const BACKOFF = [3000, 5000, 8000, 10000, 15000, 20000, 25000];

export function useMyHand() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const gameId = useGameStore((s) => s.gameId);
  const gameMode = useGameStore((s) => s.gameMode);
  const round = useGameStore((s) => s.round);
  const setMyHand = useGameStore((s) => s.setMyHand);
  const cofheReady = useGameStore((s) => s.cofheReady);
  const decryptingRef = useRef(false);

  const decryptHand = useCallback(async () => {
    if (!address || !publicClient || gameId === null || !cofheReady) return;
    if (decryptingRef.current) return;
    decryptingRef.current = true;

    const client = getClient();
    if (!client) { decryptingRef.current = false; return; }

    try {
      const deckGameId = BigInt(gameId) * 100n + BigInt(round);
      const { address: deckAddr, abi: deckAbi } = getDeckContract(gameMode);
      console.log('[useMyHand] deckGameId:', deckGameId.toString(), 'player:', address);

      const hashes = await publicClient.readContract({
        address: deckAddr, abi: deckAbi, functionName: 'getHandHashes', args: [deckGameId, address],
      }) as unknown as bigint[];

      if (hashes.every(h => h === 0n)) {
        console.log('[useMyHand] no cards dealt yet');
        decryptingRef.current = false;
        return;
      }

      console.log('[useMyHand] waiting 8s for FHE network sync...');
      await new Promise(r => setTimeout(r, 8000));

      // Force fresh permit - remove old ones first
      try {
        const chainId = await publicClient.getChainId();
        const permits = await client.permits.getPermits(chainId, address);
        if (permits) {
          for (const hash of Object.keys(permits)) {
            await client.permits.removePermit(chainId, address, hash);
          }
        }
      } catch {}
      await client.permits.getOrCreateSelfPermit();
      console.log('[useMyHand] fresh permit created');

      const hand: (number | null)[] = [];
      for (let i = 0; i < hashes.length; i++) {
        if (hashes[i] === 0n) { hand.push(null); continue; }

        let decrypted: number | null = null;
        for (let attempt = 0; attempt <= BACKOFF.length; attempt++) {
          try {
            // Try with permit first, fall back to without
            const result = await client.decryptForView(hashes[i], FheTypes.Uint8).withPermit().execute();
            decrypted = Number(result);
            break;
          } catch (err: any) {
            const msg = err?.message || String(err);
            console.warn(`[decrypt] card ${i} attempt ${attempt + 1}:`, msg);

            if (/expired|permit/i.test(msg)) {
              // Force remove and recreate permit
              try {
                const chainId = await publicClient.getChainId();
                const permits = await client.permits.getPermits(chainId, address);
                if (permits) {
                  for (const h of Object.keys(permits)) {
                    await client.permits.removePermit(chainId, address, h);
                  }
                }
              } catch {}
              try { await client.permits.getOrCreateSelfPermit(); } catch {}
            }

            if (attempt < BACKOFF.length) {
              await new Promise(r => setTimeout(r, BACKOFF[attempt]));
            }
          }
        }
        hand.push(decrypted);
        if (decrypted !== null) console.log(`[useMyHand] card ${i} =`, decrypted);
      }
      setMyHand(hand);
    } catch (e) {
      console.error('[useMyHand] error:', e);
    } finally {
      decryptingRef.current = false;
    }
  }, [address, publicClient, gameId, gameMode, round, cofheReady, setMyHand]);

  return { decryptHand };
}
