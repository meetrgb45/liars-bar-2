import { useEffect } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { initCofhe } from '../lib/cofhe';
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
          // Create self-permit for decryption
          await client.permits.getOrCreateSelfPermit();
          console.log('[useCofhe] permit ready');
          setCofheReady(true);
        }
      } catch (e) {
        console.error('[useCofhe] init failed:', e);
      }
    })();
  }, [publicClient, walletClient, address, cofheReady, setCofheReady]);

  return cofheReady;
}
