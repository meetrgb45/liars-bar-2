import type { PublicClient, WalletClient } from 'viem';

type CofheClient = any;

let _client: CofheClient | null = null;
let _initPromise: Promise<void> | null = null;
let _lastAddress: string | null = null;

export async function initCofhe(publicClient: PublicClient, walletClient: WalletClient, address: string) {
  if (_client && _lastAddress === address) return _client;
  if (_initPromise) { await _initPromise; return _client; }

  _initPromise = (async () => {
    const MAX_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const { createCofheConfig, createCofheClient } = await import('@cofhe/sdk/web');
        const { arbSepolia } = await import('@cofhe/sdk/chains');
        const config = createCofheConfig({ supportedChains: [arbSepolia] });
        const client = createCofheClient(config);
        await client.connect(publicClient, walletClient);
        _client = client;
        _lastAddress = address;
        console.log('[cofhe] initialized for', address);
        return;
      } catch (err) {
        console.error(`[cofhe] init attempt ${attempt + 1} failed:`, err);
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        }
      }
    }
  })();

  try { await _initPromise; } finally { _initPromise = null; }
  return _client;
}

export function getClient(): CofheClient | null {
  return _client;
}
