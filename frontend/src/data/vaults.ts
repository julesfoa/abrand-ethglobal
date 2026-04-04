import {
  BASE_SEPOLIA_ID,
  ARC_TESTNET_ID,
  VAULT_ADDRESS_BY_CHAIN,
  USDC_ADDRESS_BY_CHAIN,
  ORACLE_ADDRESS_BY_CHAIN,
  NAV_CONSUMER_ADDRESS_BY_CHAIN,
} from '@/lib/contracts'

export interface VaultConfig {
  fundId: string
  addresses: Record<number, {
    vault: `0x${string}`
    usdc: `0x${string}`
    oracle: `0x${string}`
    navConsumer: `0x${string}`
  }>
}

// For hackathon: single vault mapped to the active fund.
// Add entries here when deploying additional vaults.
export const vaults: VaultConfig[] = [
  {
    fundId: 'abrand-fund-i',
    addresses: {
      [BASE_SEPOLIA_ID]: {
        vault: VAULT_ADDRESS_BY_CHAIN[BASE_SEPOLIA_ID],
        usdc: USDC_ADDRESS_BY_CHAIN[BASE_SEPOLIA_ID],
        oracle: ORACLE_ADDRESS_BY_CHAIN[BASE_SEPOLIA_ID],
        navConsumer: NAV_CONSUMER_ADDRESS_BY_CHAIN[BASE_SEPOLIA_ID],
      },
      [ARC_TESTNET_ID]: {
        vault: VAULT_ADDRESS_BY_CHAIN[ARC_TESTNET_ID],
        usdc: USDC_ADDRESS_BY_CHAIN[ARC_TESTNET_ID],
        oracle: ORACLE_ADDRESS_BY_CHAIN[ARC_TESTNET_ID],
        navConsumer: NAV_CONSUMER_ADDRESS_BY_CHAIN[ARC_TESTNET_ID],
      },
    },
  },
]

export function getVaultConfig(fundId: string): VaultConfig | undefined {
  return vaults.find((v) => v.fundId === fundId)
}

export function getVaultAddresses(fundId: string, chainId: number) {
  const config = getVaultConfig(fundId)
  if (!config) return null
  return config.addresses[chainId] ?? config.addresses[BASE_SEPOLIA_ID] ?? null
}
