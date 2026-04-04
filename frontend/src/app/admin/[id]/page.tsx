'use client'

import { use, useState } from 'react'
import { notFound } from 'next/navigation'
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContracts,
  useConfig,
  useChainId,
  useAccount,
} from 'wagmi'
import { waitForTransactionReceipt } from '@wagmi/core'
import { isAddress } from 'viem'
import { useProtocol } from '@/hooks/useProtocol'
import { TxButton } from '@/components/TxButton'
import { getFundById } from '@/data/funds'
import { getVaultAddresses } from '@/data/vaults'
import {
  truncateAddress,
  formatNAV,
  formatUSDC,
  formatShares,
  INVESTOR_ROLE,
  fundVaultAbi,
  navOracleAbi,
} from '@/lib/contracts'

interface InvestorRow {
  address: string
  revoking: boolean
}

export default function AdminVaultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const fund = getFundById(id)
  if (!fund) notFound()

  return <AdminDashboard fundId={id} fundName={fund.name} />
}

function AdminDashboard({ fundId, fundName }: { fundId: string; fundName: string }) {
  const { address } = useAccount()
  const chainId = useChainId()
  const config = useConfig()
  const addrs = getVaultAddresses(fundId, chainId)
  const vaultAddress = addrs?.vault ?? ('' as `0x${string}`)
  const oracleAddress = addrs?.oracle ?? ('' as `0x${string}`)

  const { isAdmin, isManager, navPerShare, maxExitBps, refetch } = useProtocol({
    vaultAddress: addrs?.vault,
    usdcAddress: addrs?.usdc,
  })

  // ── Oracle NAV push ───────────────────────────────────────────────────────
  const [oraclePending, setOraclePending] = useState(false)
  const [oracleError, setOracleError] = useState<string | null>(null)
  const [oracleDone, setOracleDone] = useState(false)
  const { writeContractAsync: writeOracle } = useWriteContract()

  async function handleOraclePush() {
    if (!oracleAddress) { setOracleError('Oracle address not configured.'); return }
    setOracleError(null)
    setOracleDone(false)
    setOraclePending(true)
    try {
      const res = await fetch(`/api/nav-attestation?chainId=${chainId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Attestation API error ${res.status}`)
      }
      const { nav, timestamp, nonce, sig } = await res.json()
      const hash = await writeOracle({
        address: oracleAddress,
        abi: navOracleAbi,
        functionName: 'submitSignedNAV',
        args: [BigInt(nav), BigInt(timestamp), BigInt(nonce), sig as `0x${string}`],
      })
      await waitForTransactionReceipt(config, { hash })
      setOracleDone(true)
      refetch()
    } catch (err) {
      setOracleError(err instanceof Error ? err.message.split('\n')[0].slice(0, 160) : 'Failed')
    } finally {
      setOraclePending(false)
    }
  }

  // ── NAV staleness ─────────────────────────────────────────────────────────
  const [forceNavPending, setForceNavPending] = useState(false)
  const [forceNavError, setForceNavError] = useState<string | null>(null)
  const [forceNavDone, setForceNavDone] = useState(false)
  const { writeContractAsync: writeForceNav } = useWriteContract()

  const { data: navMeta, refetch: refetchNavMeta } = useReadContracts({
    contracts: [
      { address: vaultAddress, abi: fundVaultAbi, functionName: 'navUpdatedAt' },
      { address: vaultAddress, abi: fundVaultAbi, functionName: 'maxNavStaleness' },
    ],
    query: { enabled: !!vaultAddress, refetchInterval: 10_000 },
  })

  const navUpdatedAt = (navMeta?.[0]?.result ?? 0n) as bigint
  const maxNavStaleness = (navMeta?.[1]?.result ?? 0n) as bigint
  const nowSec = BigInt(Math.floor(Date.now() / 1000))
  const navAge = nowSec > navUpdatedAt ? nowSec - navUpdatedAt : 0n
  const navIsStale = maxNavStaleness > 0n && navAge > maxNavStaleness
  const navExpiresIn = maxNavStaleness > navAge ? maxNavStaleness - navAge : 0n

  async function handleForceRefreshNAV() {
    setForceNavError(null)
    setForceNavDone(false)
    setForceNavPending(true)
    try {
      const hash = await writeForceNav({
        address: vaultAddress,
        abi: fundVaultAbi,
        functionName: 'adminForceUpdateNAV',
        args: [navPerShare],
      })
      await waitForTransactionReceipt(config, { hash })
      setForceNavDone(true)
      refetch()
      refetchNavMeta()
    } catch (err) {
      setForceNavError(err instanceof Error ? err.message.split('\n')[0].slice(0, 120) : 'Failed')
    } finally {
      setForceNavPending(false)
    }
  }

  // ── Investor whitelist ────────────────────────────────────────────────────
  const [newInvestor, setNewInvestor] = useState('')
  const [investorError, setInvestorError] = useState<string | null>(null)
  const [investors, setInvestors] = useState<InvestorRow[]>([])
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)

  const { writeContract: writeGrant, data: grantTxHash, error: grantError, isPending: grantPending } = useWriteContract()
  const { isSuccess: grantConfirmed, isLoading: grantLoading } = useWaitForTransactionReceipt({ hash: grantTxHash })

  const { writeContract: writeRevoke, data: revokeTxHash, error: revokeError, isPending: revokePending } = useWriteContract()
  const { isSuccess: revokeConfirmed } = useWaitForTransactionReceipt({ hash: revokeTxHash })

  if (grantConfirmed && newInvestor) {
    setInvestors((r) => [...r, { address: newInvestor, revoking: false }])
    setNewInvestor('')
  }
  if (revokeConfirmed) {
    setInvestors((r) => r.filter((row) => !row.revoking))
  }

  function handleGrant() {
    setInvestorError(null)
    if (!isAddress(newInvestor)) { setInvestorError('Invalid address.'); return }
    if (investors.some((r) => r.address.toLowerCase() === newInvestor.toLowerCase())) {
      setInvestorError('Already whitelisted.'); return
    }
    writeGrant({
      address: vaultAddress,
      abi: fundVaultAbi,
      functionName: 'grantRole',
      args: [INVESTOR_ROLE, newInvestor as `0x${string}`],
    })
  }

  function handleRevoke(addr: string) {
    setInvestors((r) => r.map((row) => row.address === addr ? { ...row, revoking: true } : row))
    writeRevoke({
      address: vaultAddress,
      abi: fundVaultAbi,
      functionName: 'revokeRole',
      args: [INVESTOR_ROLE, addr as `0x${string}`],
    })
    setConfirmRevoke(null)
  }

  // ── Exit cap ──────────────────────────────────────────────────────────────
  const [exitCapDone, setExitCapDone] = useState(false)
  const { writeContract: writeExitCap, data: exitCapTxHash, error: exitCapError, isPending: exitCapPending } = useWriteContract()
  const { isSuccess: exitCapConfirmed, isLoading: exitCapLoading } = useWaitForTransactionReceipt({ hash: exitCapTxHash })

  if (exitCapConfirmed && !exitCapDone) {
    setExitCapDone(true)
    refetch()
  }

  function handleSetExitCap(bps: number) {
    setExitCapDone(false)
    writeExitCap({
      address: vaultAddress,
      abi: fundVaultAbi,
      functionName: 'setMaxExitBps',
      args: [BigInt(bps)],
    })
  }

  // ── Dispute resolution ────────────────────────────────────────────────────
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

  async function handleResolve(approve: boolean) {
    setDisputeError(null)
    setDisputeDone(null)
    try {
      if (!isAddress(disputeAddr)) throw new Error('Invalid address')
      const hash = await writeDispute({
        address: vaultAddress,
        abi: fundVaultAbi,
        functionName: 'resolveDispute',
        args: [disputeAddr as `0x${string}`, approve],
      })
      await waitForTransactionReceipt(config, { hash })
      setDisputeDone(approve ? 'Dispute approved — USDC sent.' : 'Dispute rejected — shares returned.')
      refetchRedemption()
      refetch()
    } catch (err) {
      setDisputeError(err instanceof Error ? err.message.split('\n')[0].slice(0, 120) : 'Failed')
    }
  }

  async function handleDisputeRedemption() {
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
        <p className="text-muted text-sm">Connect your wallet to access admin.</p>
      </PageWrap>
    )
  }

  const isGrantPending = grantPending || grantLoading

  return (
    <PageWrap>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-text">Admin</h1>
          <p className="text-sm text-muted mt-1">{fundName}</p>
        </div>
        <span className="px-3 py-1 text-xs border border-accent/40 text-accent rounded font-mono">
          Admin
        </span>
      </div>

      {/* ── NAV Staleness Banner ───────────────────────────────────── */}
      {maxNavStaleness > 0n && (
        <div className={`rounded p-4 flex flex-col gap-3 ${navIsStale ? 'bg-error/10 border border-error/40' : 'bg-surface border border-border'}`}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex flex-col gap-0.5">
              <span className={`text-sm font-medium ${navIsStale ? 'text-error' : 'text-text'}`}>
                {navIsStale ? 'NAV is stale — deposits blocked' : 'NAV is fresh'}
              </span>
              <span className="text-xs text-muted font-mono">
                {navIsStale
                  ? `${navAge.toString()}s old · limit is ${maxNavStaleness.toString()}s`
                  : `expires in ${navExpiresIn.toString()}s · last update ${navAge.toString()}s ago`}
              </span>
            </div>
            <button
              onClick={handleForceRefreshNAV}
              disabled={forceNavPending}
              className={`px-3 py-1.5 text-xs rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${navIsStale ? 'border-error text-error hover:bg-error hover:text-white' : 'border-border text-muted hover:border-accent hover:text-text'}`}
            >
              {forceNavPending ? 'Refreshing...' : 'Force Refresh NAV'}
            </button>
          </div>
          {forceNavError && <p className="text-xs text-error">{forceNavError}</p>}
          {forceNavDone && <p className="text-xs text-success">NAV timestamp reset. Deposits unblocked.</p>}
        </div>
      )}

      {/* ── Oracle NAV Push ────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider">Oracle NAV Update</h2>
        <p className="text-xs text-muted">
          Fetches a signed NAV from the attestation API and submits to the NAVOracle contract.
        </p>
        <TxButton onClick={handleOraclePush} disabled={!oracleAddress} isPending={oraclePending}>
          {oraclePending ? 'Pushing...' : 'Fetch & Push Signed NAV'}
        </TxButton>
        {oracleError && <p className="text-sm text-error">{oracleError}</p>}
        {oracleDone && <p className="text-sm text-success">NAV updated via oracle.</p>}
      </section>

      <hr className="border-border" />

      {/* ── Dispute Resolution ─────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider">Dispute Resolution</h2>
        <p className="text-xs text-muted">
          Look up redemptions by investor address. Dispute, approve, or reject.
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
              <span className="text-muted">Requested</span>
              <span className="font-mono text-text">{reqAt > 0n ? `${(nowSec - reqAt).toString()}s ago` : '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Status</span>
              <span className={`font-mono text-sm ${reqDisputed ? 'text-error' : 'text-success'}`}>
                {reqDisputed ? 'DISPUTED' : 'Pending'}
              </span>
            </div>

            <div className="flex gap-2 mt-2">
              {!reqDisputed ? (
                <TxButton onClick={handleDisputeRedemption} disabled={!isAdmin}>
                  Dispute
                </TxButton>
              ) : (
                <>
                  <button
                    onClick={() => handleResolve(true)}
                    disabled={!isAdmin}
                    className="flex-1 px-4 py-3 text-sm font-medium rounded border border-success text-success hover:bg-success hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleResolve(false)}
                    disabled={!isAdmin}
                    className="flex-1 px-4 py-3 text-sm font-medium rounded border border-error text-error hover:bg-error hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {isAddress(disputeAddr) && !hasRedemption && (
          <p className="text-sm text-muted">No pending redemption for this address.</p>
        )}

        {disputeError && <p className="text-sm text-error">{disputeError}</p>}
        {disputeDone && <p className="text-sm text-success">{disputeDone}</p>}
      </section>

      <hr className="border-border" />

      {/* ── Exit Cap ──────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted uppercase tracking-wider">Exit cap</h2>
          <span className="text-xs font-mono text-muted">
            Current: <span className="text-text">{Number(maxExitBps) / 100}%</span>
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[10, 25, 50, 100].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => handleSetExitCap(pct * 100)}
              disabled={exitCapPending || exitCapLoading || Number(maxExitBps) === pct * 100}
              className={`px-4 py-2 text-sm rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${Number(maxExitBps) === pct * 100 ? 'border-accent text-accent bg-accent/10' : 'border-border text-muted hover:border-text hover:text-text'}`}
            >
              {pct}%
            </button>
          ))}
        </div>
        {exitCapError && <p className="text-sm text-error">{exitCapError.message}</p>}
        {exitCapDone && <p className="text-sm text-success">Exit cap updated.</p>}
      </section>

      <hr className="border-border" />

      {/* ── Investor Whitelist ─────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider">Investor whitelist</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newInvestor}
            onChange={(e) => setNewInvestor(e.target.value)}
            placeholder="0x..."
            className={`${inputClass} font-mono`}
            disabled={isGrantPending}
          />
          <TxButton onClick={handleGrant} disabled={!newInvestor} isPending={isGrantPending}>
            Add
          </TxButton>
        </div>
        {investorError && <p className="text-sm text-error">{investorError}</p>}
        {grantError && <p className="text-sm text-error">{grantError.message}</p>}
      </section>

      {investors.length === 0 ? (
        <p className="text-sm text-muted">No investors added this session.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {investors.map((row) => (
            <div key={row.address} className="flex items-center justify-between p-3 bg-surface border border-border rounded">
              <a
                href={`https://testnet.arcscan.app/address/${row.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm text-text hover:text-accent transition-colors"
              >
                {truncateAddress(row.address)}
              </a>
              {confirmRevoke === row.address ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted">Revoke?</span>
                  <button onClick={() => handleRevoke(row.address)} disabled={revokePending} className="text-error hover:text-text transition-colors">
                    {revokePending && row.revoking ? 'Revoking...' : 'Yes'}
                  </button>
                  <button onClick={() => setConfirmRevoke(null)} className="text-muted hover:text-text transition-colors">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmRevoke(row.address)} className="text-sm text-muted hover:text-error transition-colors">Revoke</button>
              )}
            </div>
          ))}
          {revokeError && <p className="text-sm text-error">{revokeError.message}</p>}
        </div>
      )}
    </PageWrap>
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
