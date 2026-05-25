import { createConfig, http, fallback } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

const connectors = [
  injected({ shimDisconnect: true }),
  ...(projectId ? [walletConnect({ projectId, showQrModal: true })] : []),
];

export const config = createConfig({
  chains: [arbitrumSepolia],
  connectors,
  multiInjectedProviderDiscovery: true, // discovers all installed wallets via EIP-6963
  transports: {
    [arbitrumSepolia.id]: fallback([
      http('https://arbitrum-sepolia-rpc.publicnode.com'),
      http('https://sepolia-rollup.arbitrum.io/rpc'),
    ]),
  },
});
