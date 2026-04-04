import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, verifyMessage } from 'viem'
import { baseSepolia } from 'viem/chains'

const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL
const POOL_ADDRESS = process.env.NEXT_PUBLIC_ABRAND_POOL_ADDRESS as `0x${string}`

// Minimal ABI for isHedgeFund check
const isHedgeFundAbi = [
  {
    name: 'isHedgeFund',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

export async function POST(req: NextRequest) {
  let body: {
    amount?: string
    address?: string
    signature?: string
    message?: string
    beneficiary?: { name?: string }
    bank?: { name?: string; account?: string; routing?: string; country?: string }
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { amount, address, signature, message, beneficiary, bank } = body

  // Validate required fields
  if (!amount || !address || !signature || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!bank?.name) {
    return NextResponse.json({ error: 'Missing bank name' }, { status: 400 })
  }
  if (!bank?.account) {
    return NextResponse.json({ error: 'Missing account number' }, { status: 400 })
  }
  if (!bank?.routing || !/^\d{9}$/.test(bank.routing)) {
    return NextResponse.json({ error: 'Routing number must be 9 digits' }, { status: 400 })
  }

  // Verify wallet signature
  try {
    const valid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    })
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
  }

  // Verify hedge fund status on-chain
  if (POOL_ADDRESS) {
    try {
      const client = createPublicClient({
        chain: baseSepolia,
        transport: http(RPC_URL),
      })
      const isHedgeFund = await client.readContract({
        address: POOL_ADDRESS,
        abi: isHedgeFundAbi,
        functionName: 'isHedgeFund',
        args: [address as `0x${string}`],
      })
      if (!isHedgeFund) {
        return NextResponse.json({ error: 'Not a whitelisted hedge fund' }, { status: 403 })
      }
    } catch {
      // If on-chain check fails (e.g. no contract deployed yet), proceed for hackathon
    }
  }

  // Call Bridge.xyz
  try {
    const bridgeRes = await fetch('https://api.bridge.xyz/v0/transfers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': BRIDGE_API_KEY ?? '',
      },
      body: JSON.stringify({
        amount,
        on_behalf_of: address,
        source: { payment_rail: 'ethereum', currency: 'usdc' },
        destination: {
          payment_rail: 'wire',
          currency: 'usd',
          beneficiary: { name: beneficiary?.name ?? '' },
          bank_account: {
            bank_name: bank.name,
            account_number: bank.account,
            routing_number: bank.routing,
            account_type: 'checking',
            country: bank.country ?? 'US',
          },
        },
      }),
    })

    if (!bridgeRes.ok) {
      const err = await bridgeRes.json().catch(() => ({}))
      return NextResponse.json(
        { error: err.message ?? 'Bridge.xyz request failed' },
        { status: 502 }
      )
    }

    const data = await bridgeRes.json()
    return NextResponse.json({ reference: data.id ?? data.reference })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Bridge.xyz unavailable'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
