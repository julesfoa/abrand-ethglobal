# ABRAND

## What is ABRAND?

ABRAND is an onchain liquidity protocol that connects retail investors, entrepreneurs, and investment clubs with institutional capital from hedge funds — using USDC as the unit of value and smart contracts as the settlement layer.

Participants deposit USDC into a shared pool and receive ABR shares at a 1:1 ratio. Whitelisted hedge funds can redeem those shares for USDC at any time, giving them programmatic access to pooled retail capital onchain. The USDC they receive can then be transferred to fiat USD via integrated off-ramp rails.

---

## The Problem

**For retail / entrepreneurs / investment clubs:**
- Capital sits idle or locked in inaccessible instruments
- No easy way to participate in institutional-grade liquidity markets
- Traditional fund access requires accredited investor status and long lockups

**For hedge funds:**
- Accessing distributed retail capital requires expensive intermediaries (prime brokers, feeder funds)
- Onchain capital is fragmented across wallets and protocols with no unified access point
- USDC-to-USD rails are manual and operationally heavy

ABRAND removes both friction points by making the deposit/redemption cycle fully onchain and permissioned.

---

## How It Works

### Depositors (Retail, Entrepreneurs, Investment Clubs)

1. Connect wallet to ABRAND
2. Approve USDC spend
3. Call `deposit(amount)` — receives ABR shares 1:1
4. Shares represent their position in the pool

Depositors can be anyone. There is no minimum. There is no KYC on the deposit side.

### Hedge Funds (Redeemers)

1. Apply for whitelist access (off-chain KYC/AML handled by the ABRAND admin)
2. Once whitelisted in `AccessRegistry`, receive ABR shares (via OTC, purchase, or allocation)
3. Call `redeem(amount)` — burns ABR shares, receives USDC 1:1
4. Send USDC to fiat off-ramp (Bridge.xyz) → USD wired to bank account

Redemption is gated. Only addresses approved by the ABRAND admin can call `redeem()`.

---

## Architecture

```
Depositors (retail / clubs / entrepreneurs)
    │
    │  deposit(USDC)
    ▼
┌─────────────────────────────────────┐
│           ABRANDPool.sol            │
│                                     │
│  deposit()  → mints ABR shares      │
│  redeem()   → burns ABR, sends USDC │
│  totalLiquidity() → pool balance    │
└────────────────┬────────────────────┘
                 │ checks
                 ▼
        ┌─────────────────┐
        │ AccessRegistry  │
        │                 │
        │ addHedgeFund()  │
        │ removeHedgeFund │
        │ isHedgeFund()   │
        └─────────────────┘
                 │
                 │  redeem(USDC)
                 ▼
        Whitelisted Hedge Fund
                 │
                 │  POST /transfer
                 ▼
          Bridge.xyz API
                 │
                 ▼
        USD → Bank Account
```

---

## Smart Contracts

### `ABRANDPool.sol`

The core vault contract.

| Function | Access | Description |
|---|---|---|
| `deposit(uint256 amount)` | Anyone | Deposit USDC, receive ABR shares 1:1 |
| `redeem(uint256 amount)` | Hedge funds only | Burn ABR shares, receive USDC 1:1 |
| `totalLiquidity()` | Public view | Total USDC held in pool |

ABR shares are standard ERC-20 tokens and are transferable. A hedge fund acquires them via transfer from depositors or through a secondary market.

### `AccessRegistry.sol`

Admin-controlled whitelist for hedge fund addresses.

| Function | Access | Description |
|---|---|---|
| `addHedgeFund(address)` | Admin only | Whitelist a hedge fund address |
| `removeHedgeFund(address)` | Admin only | Remove a hedge fund from whitelist |
| `isHedgeFund(address)` | Public view | Check if address is approved |

---

## Token: ABR Share

- **Name:** ABRAND Share
- **Symbol:** ABR
- **Standard:** ERC-20
- **Peg:** 1 ABR = 1 USDC (fixed, no yield, no NAV drift)
- **Minted:** on deposit
- **Burned:** on redemption

ABR shares are the unit of account within the protocol. They are freely transferable, meaning depositors can sell or transfer their position to anyone — including hedge funds who wish to accumulate a position before redeeming.

---

## Off-Ramp: USDC → USD

After a hedge fund calls `redeem()` and receives USDC onchain, they complete the fiat conversion via **Bridge.xyz** — a stablecoin-to-fiat settlement API that handles:

- Identity verification (KYC on the hedge fund side)
- Wire transfer initiation
- Multi-currency settlement

The ABRAND frontend surfaces a "Convert to USD" flow post-redemption that calls the Bridge.xyz API directly, turning the full cycle (onchain redeem → fiat settlement) into a single user action.

---

## Access Model

| Role | Who | What they can do |
|---|---|---|
| Depositor | Anyone | deposit(), transfer ABR shares |
| Hedge Fund | Whitelisted addresses | redeem() |
| Admin | ABRAND multisig | addHedgeFund(), removeHedgeFund() |

The admin key controls the whitelist. In production this should be a multisig (e.g., Safe). For the hackathon, it is a single EOA.

---

## Deployment

**Target chain:** Base (low fees, USDC native, EVM)
**Testnet:** Base Sepolia
**USDC (Base Sepolia):** `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

Deploy via:
```bash
forge script script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify
```

Required env vars:
```
ADMIN_ADDRESS=
PRIVATE_KEY=
BASE_SEPOLIA_RPC_URL=
BASE_RPC_URL=
```

---

## User Flows

### Retail Depositor

1. Visit ABRAND app
2. Connect wallet (MetaMask, Coinbase Wallet, etc.)
3. Enter USDC amount → click Deposit
4. Sign two transactions: `approve()` + `deposit()`
5. Receive ABR shares in wallet

### Hedge Fund Manager

1. Apply for whitelist access via ABRAND (off-chain)
2. Acquire ABR shares (OTC from depositors, or via a marketplace)
3. Connect whitelisted wallet to ABRAND
4. Enter amount → click Redeem
5. USDC lands in wallet
6. Click "Convert to USD" → enter bank details → Bridge.xyz initiates wire

---

## What ABRAND Is Not

- Not a yield protocol — ABR shares do not accrue interest
- Not a lending protocol — USDC is not lent out
- Not permissionless for redemption — hedge fund access requires explicit whitelisting
- Not anonymous — hedge funds undergo off-chain KYC before being whitelisted

---

## Hackathon Scope

| Component | Status |
|---|---|
| `AccessRegistry.sol` | Done |
| `ABRANDPool.sol` | Done |
| Foundry tests (6/6) | Done |
| Deploy script (Base Sepolia) | Done |
| Frontend (deposit + redeem UI) | Pending |
| Bridge.xyz off-ramp integration | Pending |
| Admin whitelist panel | Pending |
| Mainnet deployment | Pending |
