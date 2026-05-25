import { useEffect, useRef } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { initCofhe, getClient, resetClient } from '../lib/cofhe';
import { useGameStore } from '../stores/gameStore';

export function useCofhe() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const setCofheReady = useGameStore((s) => s.setCofheReady);
  const cofheReady = useGameStore((s) => s.cofheReady);
  const lastAddrRef = useRef<string | null>(null);

  // Reset on wallet switch
  useEffect(() => {
    if (address && lastAddrRef.current && lastAddrRef.current !== address) {
      resetClient();
      setCofheReady(false);
    }
    lastAddrRef.current = address ?? null;
  }, [address, setCofheReady]);

  useEffect(() => {
    if (!publicClient || !walletClient || !address || cofheReady) return;

    (async () => {
      try {
        const client = await initCofhe(publicClient, walletClient, address);
        if (client) {
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
