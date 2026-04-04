'use client'

import { use, useState } from 'react'
import { notFound } from 'next/navigation'
import {
  useWriteContract,
  useReadContracts,
  useSignTypedData,
  useChainId,
  useConfig,
  useAccount,
} from 'wagmi'
import { waitForTransactionReceipt } from '@wagmi/core'
import { isAddress, parseUnits, encodeAbiParameters } from 'viem'
import { useProtocol } from '@/hooks/useProtocol'
import { useNavProposal } from '@/hooks/useNavProposal'
import { TxButton } from '@/components/TxButton'
import { getFundById } from '@/data/funds'
import { getVaultAddresses } from '@/data/vaults'
import {
  truncateAddress,
  formatNAV,
  formatUSDC,
  formatShares,
  navConsumerAbi,
  fundVaultAbi,
} from '@/lib/contracts'

export default function AuditVaultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const fund = getFundById(id)
  if (!fund) notFound()

  return <AuditorDashboard fundId={id} fundName={fund.name} />
}

function AuditorDashboard({ fundId, fundName }: { fundId: string; fundName: string }) {
  const { address } = useAccount()
  const chainId = useChainId()
  const config = useConfig()
  const addrs = getVaultAddresses(fundId, chainId)
  const vaultAddress = addrs?.vault ?? ('' as `0x${string}`)
  const navConsumerAddress = addrs?.navConsumer ?? ('' as `0x${string}`)

  const { navPerShare, isManager, isAdmin, refetch } = useProtocol({ vaultAddress: addrs?.vault, usdcAddress: addrs?.usdc })
  const navProposal = useNavProposal(vaultAddress)

  // ── Auditor status from NAVConsumer ────────────────────────────────────────
  const { data: auditorData, refetch: refetchAuditor } = useReadContracts({
    contracts: [
      { address: navConsumerAddress, abi: navConsumerAbi, functionName: 'isAuditor', args: [address!] },
      { address: navConsumerAddress, abi: navConsumerAbi, functionName: 'lastNonce' },
      { address: navConsumerAddress, abi: navConsumerAbi, functionName: 'lastUpdatedAt' },
      { address: navConsumerAddress, abi: navConsumerAbi, functionName: 'lastBenchmarkPrice' },
      { address: vaultAddress, abi: fundVaultAbi, functionName: 'navUpdatedAt' },
      { address: vaultAddress, abi: fundVaultAbi, functionName: 'maxNavStaleness' },
    ],
    query: { enabled: !!address && !!navConsumerAddress, refetchInterval: 10_000 },
  })

  const isAuditor = (auditorData?.[0]?.result ?? false) as boolean
  const lastNonce = (auditorData?.[1]?.result ?? 0n) as bigint
  const benchmarkPrice = (auditorData?.[3]?.result ?? 0n) as bigint
  const navUpdatedAt = (auditorData?.[4]?.result ?? 0n) as bigint
  const maxNavStaleness = (auditorData?.[5]?.result ?? 0n) as bigint

  const nowSec = BigInt(Math.floor(Date.now() / 1000))
  const navAge = nowSec > navUpdatedAt ? nowSec - navUpdatedAt : 0n
  const navIsStale = maxNavStaleness > 0n && navAge > maxNavStaleness

  // ── NAV Attestation (fallback EIP-712 flow) ────────────────────────────────
  const [attestNav, setAttestNav] = useState('')
  const [attestPending, setAttestPending] = useState(false)
  const [attestError, setAttestError] = useState<string | null>(null)
  const [attestDone, setAttestDone] = useState(false)

  const { signTypedDataAsync } = useSignTypedData()
  const { writeContractAsync: writeAttest } = useWriteContract()

  async function handleAttest() {
    setAttestError(null)
    setAttestDone(false)
    setAttestPending(true)
    try {
      const parsed = parseFloat(attestNav)
      if (isNaN(parsed) || parsed <= 0) throw new Error('Enter a valid NAV (e.g. 1.05)')

      const navValue = parseUnits(attestNav, 6)
      const timestamp = BigInt(Math.floor(Date.now() / 1000))
      const nonce = lastNonce + 1n

      const signature = await signTypedDataAsync({
        domain: { name: 'NAVConsumer', version: '1', chainId, verifyingContract: navConsumerAddress },
        types: {
          NAVUpdate: [
            { name: 'vault', type: 'address' },
            { name: 'nav', type: 'uint256' },
            { name: 'timestamp', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
          ],
        },
        primaryType: 'NAVUpdate',
        message: { vault: vaultAddress, nav: navValue, timestamp, nonce },
      })

      const report = encodeAbiParameters(
        [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'bytes' }],
        [navValue, timestamp, nonce, signature]
      )

      const hash = await writeAttest({
        address: navConsumerAddress,
        abi: navConsumerAbi,
        functionName: 'onReport',
        args: [report],
      })
      await waitForTransactionReceipt(config, { hash })
      setAttestDone(true)
      refetch()
      refetchAuditor()
    } catch (err) {
      setAttestError(err instanceof Error ? err.message.split('\n')[0].slice(0, 120) : 'Failed')
    } finally {
      setAttestPending(false)
    }
  }

  // ── Reject reason ─────────────────────────────────────────────────────────
  const [rejectReason, setRejectReason] = useState('')

  // ── Dispute Management ─────────────────────────────────────────────────────
  const [disputeAddr, setDisputeAddr] = useState('')
  const [disputeError, setDisputeError] = useState<string | null>(null)
  const [disputeDone, setDisputeDone] = useState<string | null>(null)

  const { data: redemptionData, refetch: refetchRedemption } = useReadContracts({
    contracts: [
      { address: vaultAddress, abi: fundVaultAbi, functionName: 'redemptionRequests', args: [disputeAddr as `0x${string}`] },
    ],
    query: { enabled: isAddress(disputeAddr), refetchInterval: 10_000 },
  })

  const redemption = redemptionData?.[0]?.result as readonly [bigint, bigint, bigint, boolean] | undefined
  const reqShares = redemption?.[0] ?? 0n
  const reqNav = redemption?.[1] ?? 0n
  const reqAt = redemption?.[2] ?? 0n
  const reqDisputed = redemption?.[3] ?? false
  const hasRedemption = reqShares > 0n

  const { writeContractAsync: writeDispute } = useWriteContract()

  async function handleDispute() {
    setDisputeError(null)
    setDisputeDone(null)
    try {
      if (!isAddress(disputeAddr)) throw new Error('Invalid address')
      const hash = await writeDispute({
        address: vaultAddress,
        abi: fundVaultAbi,
        functionName: 'disputeRedemption',
        args: [disputeAddr as `0x${string}`],
      })
      await waitForTransactionReceipt(config, { hash })
      setDisputeDone('Redemption disputed.')
      refetchRedemption()
    } catch (err) {
      setDisputeError(err instanceof Error ? err.message.split('\n')[0].slice(0, 120) : 'Failed')
    }
  }

  if (!address) {
    return (
      <PageWrap>
        <p className="text-muted text-sm">Connect your wallet to access the auditor panel.</p>
      </PageWrap>
    )
  }

  return (
    <PageWrap>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-text">Auditor</h1>
          <p className="text-sm text-muted mt-1">{fundName}</p>
        </div>
        <span className="px-3 py-1 text-xs border border-accent/40 text-accent rounded font-mono">
          Auditor
        </span>
      </div>

      {/* ── Status badges ─────────────────────────────────────────── */}
      <div className="flex gap-3 flex-wrap">
        <Badge ok={isAuditor} label={isAuditor ? 'Registered Auditor' : 'Not Auditor'} />
        <Badge ok={!navIsStale} label={navIsStale ? 'NAV Stale' : 'NAV Fresh'} />
        {benchmarkPrice !== 0n && (
          <span className="px-2 py-1 text-xs font-mono rounded bg-surface border border-border text-muted">
            ETH/USD: ${(Number(benchmarkPrice) / 1e8).toFixed(2)}
          </span>
        )}
      </div>

      {/* ── NAV info ──────────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded p-4 flex flex-col gap-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Current NAV</span>
          <span className="font-mono text-text">{formatNAV(navPerShare)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Last updated</span>
          <span className="font-mono text-text">{navUpdatedAt > 0n ? `${navAge.toString()}s ago` : 'Never'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Nonce</span>
          <span className="font-mono text-text">{lastNonce.toString()}</span>
        </div>
      </div>

      <hr className="border-border" />

      {/* ── Pending NAV Review ────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider">Pending NAV Review</h2>

        {navProposal.hasPendingProposal ? (
          <div className="bg-surface border border-accent/30 rounded p-4 flex flex-col gap-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Proposed NAV</span>
              <span className="font-mono text-text font-bold">{formatNAV(navProposal.pendingNav)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Current NAV</span>
              <span className="font-mono text-text">{formatNAV(navPerShare)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Change</span>
              <span className={`font-mono text-sm ${navProposal.pendingNav > navPerShare ? 'text-success' : 'text-error'}`}>
                {navPerShare > 0n
                  ? `${((Number(navProposal.pendingNav) - Number(navPerShare)) / Number(navPerShare) * 100).toFixed(2)}%`
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Proposed by</span>
              <span className="font-mono text-text text-xs">{truncateAddress(navProposal.pendingNavProposer)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Proposed</span>
              <span className="font-mono text-text">
                {navProposal.pendingNavTimestamp > 0n
                  ? `${(nowSec - navProposal.pendingNavTimestamp).toString()}s ago`
                  : '—'}
              </span>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <div className="flex gap-2">
                <button
                  onClick={() => navProposal.approve()}
                  disabled={navProposal.pending || !isAuditor}
                  className="flex-1 px-4 py-3 text-sm font-medium rounded border border-success text-success
                    hover:bg-success hover:text-white transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {navProposal.pending ? 'Processing...' : 'Approve NAV'}
                </button>
                <button
                  onClick={() => navProposal.reject(rejectReason || 'Rejected by auditor')}
                  disabled={navProposal.pending || !isAuditor}
                  className="flex-1 px-4 py-3 text-sm font-medium rounded border border-error text-error
                    hover:bg-error hover:text-white transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reject
                </button>
              </div>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Rejection reason (optional)"
                className={`${inputClass} text-xs`}
              />
            </div>

            {navProposal.error && <p className="text-sm text-error">{navProposal.error}</p>}
            {navProposal.done && <p className="text-sm text-success">{navProposal.done}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted">No pending NAV proposal. The manager has not submitted a new NAV for review.</p>
        )}
      </section>

      <hr className="border-border" />

      {/* ── NAV Attestation (EIP-712 fallback) ────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider">NAV Attestation</h2>
        {!isAuditor && (
          <div className="bg-error/10 border border-error/30 rounded p-3 text-sm text-error">
            Your wallet is not registered as an auditor. Ask the admin to call{' '}
            <code className="font-mono text-xs">addAuditor({truncateAddress(address)})</code>.
          </div>
        )}
        <p className="text-xs text-muted">
          Sign an EIP-712 attestation of the NAV value and submit directly on-chain.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={attestNav}
            onChange={(e) => { setAttestNav(e.target.value); setAttestDone(false) }}
            placeholder="1.0500"
            className={inputClass}
            disabled={attestPending || !isAuditor}
          />
          <TxButton onClick={handleAttest} disabled={!attestNav || !isAuditor} isPending={attestPending}>
            Sign & Submit
          </TxButton>
        </div>
        {attestError && <p className="text-sm text-error">{attestError}</p>}
        {attestDone && <p className="text-sm text-success">NAV attested to {formatNAV(parseUnits(attestNav || '0', 6))}.</p>}
      </section>

      <hr className="border-border" />

      {/* ── Dispute Management ────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider">Flag Redemption</h2>
        <p className="text-xs text-muted">
          Look up a pending redemption by investor address. Flag suspicious redemptions for admin review.
        </p>

        <input
          type="text"
          value={disputeAddr}
          onChange={(e) => { setDisputeAddr(e.target.value); setDisputeDone(null) }}
          placeholder="Investor 0x..."
          className={`${inputClass} font-mono`}
        />

        {isAddress(disputeAddr) && hasRedemption && (
          <div className="bg-surface border border-border rounded p-4 flex flex-col gap-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Shares</span>
              <span className="font-mono text-text">{formatShares(reqShares)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">NAV at request</span>
              <span className="font-mono text-text">{formatNAV(reqNav)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">USDC owed</span>
              <span className="font-mono text-text">{formatUSDC((reqShares * reqNav) / BigInt(1e18))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Status</span>
              <span className={`font-mono text-sm ${reqDisputed ? 'text-error' : 'text-success'}`}>
                {reqDisputed ? 'DISPUTED' : 'Pending'}
              </span>
            </div>
            {!reqDisputed && (
              <TxButton onClick={handleDispute} disabled={!isManager && !isAdmin && !isAuditor}>
                Flag for Dispute
              </TxButton>
            )}
            {reqDisputed && <p className="text-xs text-muted">Already disputed. Admin will resolve.</p>}
          </div>
        )}

        {isAddress(disputeAddr) && !hasRedemption && (
          <p className="text-sm text-muted">No pending redemption for this address.</p>
        )}

        {disputeError && <p className="text-sm text-error">{disputeError}</p>}
        {disputeDone && <p className="text-sm text-success">{disputeDone}</p>}
      </section>
    </PageWrap>
  )
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded ${ok ? 'bg-success/10 text-success border border-success/30' : 'bg-error/10 text-error border border-error/30'}`}>
      {label}
    </span>
  )
}

const inputClass =
  'flex-1 bg-surface border border-border rounded px-4 py-3 text-text text-sm outline-none ' +
  'focus:border-accent focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg ' +
  'placeholder:text-muted disabled:opacity-50'

function PageWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center px-4 py-16">
      <div className="w-full max-w-[480px] flex flex-col gap-6">{children}</div>
    </div>
  )
}
