'use client'

import Link from 'next/link'
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { truncateAddress, ARC_TESTNET_ID } from '@/lib/contracts'

export function Navbar() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const onWrongNetwork = isConnected && chainId !== ARC_TESTNET_ID

  return (
    <>
      <header
        role="banner"
        className="w-full h-16 bg-bg border-b border-border flex items-center px-6"
      >
        {/* Logo */}
        <div className="flex-1">
          <Link
            href="/"
            className="text-text font-bold text-lg tracking-tight hover:text-accent transition-colors"
          >
            ABRAND
          </Link>
        </div>

        {/* Right: role nav + wallet */}
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-muted hover:text-text transition-colors">
              Markets
            </Link>
            {address && (
              <Link href="/portfolio" className="text-muted hover:text-text transition-colors">
                Portfolio
              </Link>
            )}
            <Link href="/manage/abrand-fund-i" className="text-muted hover:text-text transition-colors">
              Manage
            </Link>
            <Link href="/audit/abrand-fund-i" className="text-muted hover:text-text transition-colors">
              Audit
            </Link>
            <Link href="/admin/abrand-fund-i" className="text-muted hover:text-text transition-colors">
              Admin
            </Link>
          </nav>

          {isConnected ? (
            <button
              onClick={() => disconnect()}
              title={address}
              className="px-3 py-1.5 bg-bg border border-border rounded text-xs font-mono text-text
                hover:border-accent transition-colors
                focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
            >
              {truncateAddress(address!)}
            </button>
          ) : (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="min-h-[36px] px-4 py-1.5 border border-accent text-accent text-sm font-medium rounded
                hover:bg-accent hover:text-white transition-colors
                focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Wrong network banner */}
      {onWrongNetwork && (
        <div className="w-full bg-error/10 border-b border-error/30 px-6 py-2 flex items-center justify-between">
          <span className="text-sm text-error">
            Wrong network — please switch to Arc Testnet
          </span>
          <button
            onClick={() => switchChain({ chainId: ARC_TESTNET_ID })}
            className="text-sm text-error border border-error/50 rounded px-3 py-1
              hover:bg-error hover:text-white transition-colors
              focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2 focus:ring-offset-bg"
          >
            Switch to Arc
          </button>
        </div>
      )}
    </>
  )
}
