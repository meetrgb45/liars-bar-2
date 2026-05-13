import { createConfig, http, fallback } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [arbitrumSepolia],
  multiInjectedProviderDiscovery: false,
  connectors: [injected()],
  transports: {
    [arbitrumSepolia.id]: fallback([
      http('https://arbitrum-sepolia-rpc.publicnode.com'),
      http('https://sepolia-rollup.arbitrum.io/rpc'),
    ]),
  },
});
