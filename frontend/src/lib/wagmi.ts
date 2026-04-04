import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { baseSepolia } from 'wagmi/chains'
import { arcTestnet } from './chains'

export { arcTestnet }

export const config = createConfig({
  chains: [arcTestnet, baseSepolia],
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http('https://rpc.testnet.arc.network'),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL ?? 'https://sepolia.base.org'),
  },
  ssr: true,
})
