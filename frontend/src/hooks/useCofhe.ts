import { useEffect } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { initCofhe, getClient } from '../lib/cofhe';
import { useGameStore } from '../stores/gameStore';

export function useCofhe() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const setCofheReady = useGameStore((s) => s.setCofheReady);
  const cofheReady = useGameStore((s) => s.cofheReady);

  useEffect(() => {
    if (!publicClient || !walletClient || !address || cofheReady) return;

    (async () => {
      try {
        const client = await initCofhe(publicClient, walletClient, address);
        if (client) {
          // Remove any stale permits from previous sessions, then create fresh
          try {
            const chainId = await publicClient.getChainId();
            const permits = await client.permits.getPermits(chainId, address);
            if (permits) {
              for (const hash of Object.keys(permits)) {
                await client.permits.removePermit(chainId, address, hash);
              }
            }
          } catch {}
          // Create fresh self-permit
          await client.permits.getOrCreateSelfPermit();
          console.log('[useCofhe] fresh permit created');
          setCofheReady(true);
        }
      } catch (e) {
        console.error('[useCofhe] init failed:', e);
      }
    })();
  }, [publicClient, walletClient, address, cofheReady, setCofheReady]);

  return cofheReady;
}
