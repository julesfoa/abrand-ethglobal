'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isAddress } from 'viem'
import { useSignMessage, useConfig, useChainId } from 'wagmi'
import { waitForTransactionReceipt } from '@wagmi/core'
import { useWriteContract } from 'wagmi'
import { useConnect, useAccount } from 'wagmi'
import { useProtocol } from '@/hooks/useProtocol'
import { useNavProposal } from '@/hooks/useNavProposal'
import { useVaultFees } from '@/hooks/useVaultFees'
import { TxButton } from '@/components/TxButton'
import { getFundById } from '@/data/funds'
import { getVaultAddresses } from '@/data/vaults'
import {
  fundVaultAbi,
  formatUSDC,
  formatUSDCRaw,
  formatNAV,
  parseUSDC,
  truncateAddress,
} from '@/lib/contracts'

type WithdrawMode = 'address' | 'bridge'

export default function ManageVaultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const fund = getFundById(id)
  if (!fund) notFound()

  const { isConnected } = useAccount()
  const { connect, connectors } = useConnect()

  if (!isConnected) {
    return (
      <PageWrap>
        <p className="text-sm text-muted">Connect your wallet to access fund management.</p>
        <button
          onClick={() => connect({ connector: connectors[0] })}
          className="mt-4 px-4 py-2.5 bg-accent text-white text-sm rounded hover:bg-red-700 transition-colors"
        >
          Connect Wallet
        </button>
      </PageWrap>
    )
  }

  return <ManagerDashboard fundId={id} fundName={fund.name} />
}

function ManagerDashboard({ fundId, fundName }: { fundId: string; fundName: string }) {
  const chainId = useChainId()
  const addrs = getVaultAddresses(fundId, chainId)
  const vaultAddress = addrs?.vault ?? ('' as `0x${string}`)

  const protocol = useProtocol({ vaultAddress: addrs?.vault, usdcAddress: addrs?.usdc })
  const navProposal = useNavProposal(vaultAddress)
  const fees = useVaultFees(vaultAddress)
  const config = useConfig()
  const { signMessageAsync } = useSignMessage()
  const { writeContractAsync } = useWriteContract()

  // ── Fulfill redemption ──────────────────────────────────────────────────────
  const [fulfillAddr, setFulfillAddr] = useState('')
  const [fulfillPending, setFulfillPending] = useState(false)
  const [fulfillError, setFulfillError] = useState<string | null>(null)
  const [fulfillDone, setFulfillDone] = useState(false)

  // ── Withdraw capital ────────────────────────────────────────────────────────
  const [withdrawMode, setWithdrawMode] = useState<WithdrawMode>('address')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [toAddress, setToAddress] = useState('')
  const [withdrawPending, setWithdrawPending] = useState(false)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)
  const [withdrawDone, setWithdrawDone] = useState(false)
  const [withdrawTx, setWithdrawTx] = useState('')

  // ── Bridge wire fields ──────────────────────────────────────────────────────
  const [beneficiaryName, setBeneficiaryName] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [routingNumber, setRoutingNumber] = useState('')
  const [bankCountry, setBankCountry] = useState('US')
  const [wireReference, setWireReference] = useState<string | null>(null)

  // ── Propose NAV ─────────────────────────────────────────────────────────────
  const [newNav, setNewNav] = useState('')

  // ── Fee config ──────────────────────────────────────────────────────────────
  const [mgmtFeeInput, setMgmtFeeInput] = useState('')
  const [perfFeeInput, setPerfFeeInput] = useState('')
  const [feeDone, setFeeDone] = useState<string | null>(null)

  const freeCapital = protocol.totalAssets

  async function handleWithdrawToAddress() {
    setWithdrawError(null)
    setWithdrawDone(false)
    const parsed = parseUSDC(withdrawAmount)
    if (parsed === 0n) { setWithdrawError('Enter an amount.'); return }
    if (!isAddress(toAddress)) { setWithdrawError('Invalid destination address.'); return }
    if (parsed > freeCapital) { setWithdrawError('Amount exceeds free capital.'); return }

    setWithdrawPending(true)
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: fundVaultAbi,
        functionName: 'withdrawCapital',
        args: [parsed, toAddress as `0x${string}`],
      })
      await waitForTransactionReceipt(config, { hash })
      setWithdrawTx(hash)
      setWithdrawDone(true)
      protocol.refetch()
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message.split('\n')[0].slice(0, 120) : 'Failed')
    } finally {
      setWithdrawPending(false)
    }
  }

  async function handleWithdrawAndWire() {
    setWithdrawError(null)
    setWithdrawDone(false)
    setWireReference(null)

    const parsed = parseUSDC(withdrawAmount)
    if (parsed === 0n) { setWithdrawError('Enter an amount.'); return }
    if (parsed > freeCapital) { setWithdrawError('Amount exceeds free capital.'); return }
    if (!bankName.trim()) { setWithdrawError('Bank name required.'); return }
    if (!accountNumber.trim()) { setWithdrawError('Account number required.'); return }
    if (!/^\d{9}$/.test(routingNumber)) { setWithdrawError('Routing number must be 9 digits.'); return }

    setWithdrawPending(true)
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: fundVaultAbi,
        functionName: 'withdrawCapital',
        args: [parsed, protocol.address!],
      })
      await waitForTransactionReceipt(config, { hash })
      setWithdrawTx(hash)
      protocol.refetch()

      const ts = Date.now()
      const message = `ABRAND capital withdrawal ${withdrawAmount} USDC ${ts}`
      const signature = await signMessageAsync({ message })

      const res = await fetch('/api/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: withdrawAmount,
          address: protocol.address,
          signature,
          message,
          beneficiary: { name: beneficiaryName || fundName },
          bank: { name: bankName, account: accountNumber, routing: routingNumber, country: bankCountry },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Bridge.xyz error (${res.status})`)
      setWireReference(data.reference ?? 'ABRAND-' + ts)
      setWithdrawDone(true)
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message.split('\n')[0].slice(0, 150) : 'Failed')
    } finally {
      setWithdrawPending(false)
    }
  }

  async function handleFulfill() {
    setFulfillError(null)
    setFulfillDone(false)
    if (!isAddress(fulfillAddr)) { setFulfillError('Invalid address.'); return }
    setFulfillPending(true)
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: fundVaultAbi,
        functionName: 'fulfillRedemption',
        args: [fulfillAddr as `0x${string}`],
      })
      await waitForTransactionReceipt(config, { hash })
      setFulfillDone(true)
      setFulfillAddr('')
      protocol.refetch()
    } catch (err) {
      setFulfillError(err instanceof Error ? err.message.split('\n')[0].slice(0, 120) : 'Failed')
    } finally {
      setFulfillPending(false)
    }
  }

  async function handleSetFee(type: 'management' | 'performance') {
    setFeeDone(null)
    const input = type === 'management' ? mgmtFeeInput : perfFeeInput
    const pct = parseFloat(input)
    if (isNaN(pct) || pct < 0 || pct > 100) { fees.refetch(); return }
    const bps = Math.round(pct * 100)
    if (type === 'management') {
      await fees.setManagementFee(bps)
      setMgmtFeeInput('')
    } else {
      await fees.setPerformanceFee(bps)
      setPerfFeeInput('')
    }
    if (!fees.error) setFeeDone(`${type === 'management' ? 'Management' : 'Performance'} fee updated to ${pct}%.`)
  }

  return (
    <div className="min-h-[calc(100vh-64px)] px-6 py-10 max-w-4xl mx-auto flex flex-col gap-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-text">Fund Management</h1>
          <p className="text-sm text-muted mt-1">{fundName}</p>
        </div>
        <span className="px-3 py-1 text-xs border border-accent/40 text-accent rounded font-mono">
          Manager
        </span>
      </div>

      {/* ── Vault stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total AUM" value={protocol.isLoading ? '...' : formatUSDC(protocol.totalAssets)} />
        <StatCard label="Free Capital" value={protocol.isLoading ? '...' : formatUSDC(freeCapital)} sub="deployable" />
        <StatCard label="NAV / Share" value={protocol.isLoading ? '...' : formatNAV(protocol.navPerShare)} />
        <StatCard label="Your USDC" value={protocol.isLoading ? '...' : `$${formatUSDCRaw(protocol.usdcBalance)}`} />
      </div>

      {/* ── Propose NAV ────────────────────────────────────────────────────── */}
      <Section title="Propose NAV">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted">Current:</span>
          <span className="font-mono text-text tabular-nums">{formatNAV(protocol.navPerShare)}</span>
          <span className="text-muted">/ share</span>
        </div>

        {navProposal.hasPendingProposal && (
          <div className="bg-surface border border-accent/30 rounded p-3 flex flex-col gap-1">
            <span className="text-sm text-accent font-medium">Pending proposal</span>
            <span className="text-xs text-muted font-mono">
              {formatNAV(navProposal.pendingNav)} — awaiting auditor approval
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={newNav}
            onChange={(e) => setNewNav(e.target.value)}
            placeholder="1.0500"
            disabled={navProposal.pending}
            className={inputClass}
          />
          <TxButton
            onClick={() => navProposal.propose(newNav).then(() => setNewNav(''))}
            disabled={!newNav}
            isPending={navProposal.pending}
          >
            Propose
          </TxButton>
        </div>
        {navProposal.error && <p className="text-sm text-error">{navProposal.error}</p>}
        {navProposal.done && <p className="text-sm text-success">{navProposal.done}</p>}
        <p className="text-xs text-muted">
          Proposed NAV must be approved by the auditor before it takes effect.
        </p>
      </Section>

      {/* ── Fee Configuration ──────────────────────────────────────────────── */}
      <Section title="Fees">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface border border-border rounded px-4 py-3 flex flex-col gap-1">
            <span className="text-xs text-muted">Management Fee</span>
            <span className="text-lg font-mono font-bold text-text">
              {(Number(fees.managementFeeBps) / 100).toFixed(2)}%
            </span>
          </div>
          <div className="bg-surface border border-border rounded px-4 py-3 flex flex-col gap-1">
            <span className="text-xs text-muted">Performance Fee</span>
            <span className="text-lg font-mono font-bold text-text">
              {(Number(fees.performanceFeeBps) / 100).toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-xs text-muted">Management %</label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={mgmtFeeInput}
                onChange={(e) => setMgmtFeeInput(e.target.value)}
                placeholder="2.00"
                disabled={fees.pending}
                className={inputClass}
              />
              <TxButton onClick={() => handleSetFee('management')} disabled={!mgmtFeeInput} isPending={fees.pending}>
                Set
              </TxButton>
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-xs text-muted">Performance %</label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={perfFeeInput}
                onChange={(e) => setPerfFeeInput(e.target.value)}
                placeholder="20.00"
                disabled={fees.pending}
                className={inputClass}
              />
              <TxButton onClick={() => handleSetFee('performance')} disabled={!perfFeeInput} isPending={fees.pending}>
                Set
              </TxButton>
            </div>
          </div>
        </div>

        {fees.accruedFees > 0n && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">
              Accrued: <span className="text-text font-mono">{formatUSDC(fees.accruedFees)}</span>
            </span>
            <TxButton onClick={fees.collectFees} isPending={fees.pending}>
              Collect Fees
            </TxButton>
          </div>
        )}

        {fees.error && <p className="text-sm text-error">{fees.error}</p>}
        {feeDone && <p className="text-sm text-success">{feeDone}</p>}
      </Section>

      {/* ── Deploy Capital ──────────────────────────────────────────────────── */}
      <Section title="Deploy Capital">
        <p className="text-xs text-muted -mt-1">
          Withdraw USDC from the vault. Send onchain to a Coinbase address, or wire directly to a bank via Bridge.xyz.
        </p>

        <div className="flex border-b border-border">
          <TabBtn active={withdrawMode === 'address'} onClick={() => setWithdrawMode('address')}>
            Send to Address
          </TabBtn>
          <TabBtn active={withdrawMode === 'bridge'} onClick={() => setWithdrawMode('bridge')}>
            Wire via Bridge.xyz
          </TabBtn>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted">Amount (USDC)</label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={withdrawAmount}
              onChange={(e) => { setWithdrawAmount(e.target.value); setWithdrawDone(false) }}
              placeholder="0.00"
              disabled={withdrawPending || withdrawDone}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setWithdrawAmount(formatUSDCRaw(freeCapital))}
              className="px-3 py-2 text-xs border border-border text-muted rounded hover:border-accent hover:text-text transition-colors"
            >
              Max
            </button>
          </div>
          <p className="text-xs text-muted">
            Free capital: <span className="text-text font-mono">${formatUSDCRaw(freeCapital)}</span>
          </p>
        </div>

        {withdrawMode === 'address' ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted">Destination address</label>
              <input
                type="text"
                value={toAddress}
                onChange={(e) => { setToAddress(e.target.value); setWithdrawDone(false) }}
                placeholder="0x..."
                disabled={withdrawPending || withdrawDone}
                className={`${inputClass} font-mono`}
              />
            </div>
            {!withdrawDone ? (
              <TxButton onClick={handleWithdrawToAddress} disabled={!withdrawAmount || !toAddress} isPending={withdrawPending}>
                {withdrawPending ? 'Sending...' : 'Send USDC'}
              </TxButton>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-success">Sent ${withdrawAmount} USDC to {truncateAddress(toAddress)}.</p>
                <a href={`https://testnet.arcscan.app/tx/${withdrawTx}`} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline font-mono">
                  View on ArcScan →
                </a>
                <button onClick={() => { setWithdrawDone(false); setWithdrawAmount(''); setToAddress('') }} className="text-xs text-muted hover:text-text transition-colors text-left">
                  Send another →
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Beneficiary name">
                <input type="text" value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} placeholder={fundName} disabled={withdrawPending || withdrawDone} className={inputClass} />
              </Field>
              <Field label="Bank country">
                <select value={bankCountry} onChange={(e) => setBankCountry(e.target.value)} disabled={withdrawPending || withdrawDone} className={inputClass}>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="EU">European Union</option>
                </select>
              </Field>
              <Field label="Bank name">
                <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Chase Bank" disabled={withdrawPending || withdrawDone} className={inputClass} />
              </Field>
              <Field label="Routing number">
                <input type="text" inputMode="numeric" value={routingNumber} onChange={(e) => setRoutingNumber(e.target.value)} placeholder="021000021" maxLength={9} disabled={withdrawPending || withdrawDone} className={inputClass} />
              </Field>
              <Field label="Account number" className="sm:col-span-2">
                <input type="password" inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="••••••••" disabled={withdrawPending || withdrawDone} className={inputClass} />
              </Field>
            </div>
            {!withdrawDone ? (
              <TxButton onClick={handleWithdrawAndWire} disabled={!withdrawAmount || !bankName || !accountNumber || !routingNumber} isPending={withdrawPending}>
                {withdrawPending ? 'Withdrawing & wiring...' : 'Withdraw & Wire'}
              </TxButton>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-success">Wire initiated. Funds arrive in 1–3 business days.</p>
                {wireReference && <p className="text-xs text-muted font-mono">Reference: <span className="text-text">{wireReference}</span></p>}
                <button onClick={() => { setWithdrawDone(false); setWithdrawAmount('') }} className="text-xs text-muted hover:text-text transition-colors text-left">Send another →</button>
              </div>
            )}
          </div>
        )}
        {withdrawError && <p className="text-sm text-error">{withdrawError}</p>}
      </Section>

      {/* ── Fulfill Redemptions ─────────────────────────────────────────────── */}
      <Section title="Fulfill Redemptions">
        <p className="text-xs text-muted -mt-1">
          Enter the investor's address to pay out their queued redemption at the NAV locked at request time.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={fulfillAddr}
            onChange={(e) => { setFulfillAddr(e.target.value); setFulfillDone(false) }}
            placeholder="Investor 0x..."
            disabled={fulfillPending}
            className={`${inputClass} font-mono`}
          />
          <TxButton onClick={handleFulfill} disabled={!fulfillAddr} isPending={fulfillPending}>
            Fulfill
          </TxButton>
        </div>
        {fulfillError && <p className="text-sm text-error">{fulfillError}</p>}
        {fulfillDone && <p className="text-sm text-success">Redemption fulfilled. USDC sent to investor.</p>}
        <p className="text-xs text-muted">
          Investor can also visit{' '}
          <Link href="/redeem" className="text-accent hover:underline">/redeem</Link>{' '}
          to request and cancel their own redemption.
        </p>
      </Section>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface border border-border rounded px-4 py-4 flex flex-col gap-1">
      <span className="text-xs text-muted uppercase tracking-wider">{label}</span>
      <span className="text-xl font-mono tabular-nums font-bold text-text">{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-t border-border pt-6">
      <h2 className="text-sm font-medium text-muted uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${active ? 'border-accent text-text font-medium' : 'border-transparent text-muted hover:text-text'}`}>
      {children}
    </button>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <label className="text-xs text-muted">{label}</label>
      {children}
    </div>
  )
}

function PageWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center px-4 py-16">
      <div className="w-full max-w-[480px] flex flex-col gap-6">{children}</div>
    </div>
  )
}

const inputClass =
  'w-full bg-surface border border-border rounded px-4 py-3 text-text text-sm outline-none ' +
  'focus:border-accent focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg ' +
  'placeholder:text-muted disabled:opacity-50'
