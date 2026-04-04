# ABRAND — Agent Context Briefing

Read this before doing any work on this repo.

---

## What is ABRAND

Onchain liquidity protocol connecting retail depositors with institutional hedge fund redeemers.

- **Depositors** (retail, entrepreneurs, investment clubs): deposit USDC, receive ABR shares 1:1
- **Redeemers** (whitelisted hedge funds): burn ABR shares, receive USDC 1:1, then off-ramp to USD via Bridge.xyz

Fixed 1:1 peg. No yield. No NAV. No complexity.

---

## Current State (Saturday morning, ETHGlobal Cannes hackathon)

### Done
- `contracts/src/AccessRegistry.sol` — admin-controlled hedge fund whitelist
- `contracts/src/ABRANDPool.sol` — deposit (anyone) + redeem (whitelisted only), ERC-20 ABR shares
- `contracts/test/ABRANDPool.t.sol` — 6 tests, all passing
- `contracts/script/Deploy.s.sol` — deploy script targeting Base Sepolia USDC
- `ABRAND.md` — full protocol documentation

### Pending (priority order)
1. Deploy to Base Sepolia
2. Next.js frontend — deposit UI (retail) + redeem UI (hedge fund)
3. Bridge.xyz off-ramp call post-redeem
4. Admin whitelist panel
5. Base mainnet deploy + Basescan verification

---

## Tech Stack

| Layer | Choice |
|---|---|
| Contracts | Solidity 0.8.24 + Foundry |
| Libraries | OpenZeppelin (AccessControl, ERC-20, SafeERC20) |
| Chain | Base (Sepolia testnet → mainnet) |
| Stablecoin | USDC (Base Sepolia: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`) |
| Frontend | Next.js + Tailwind + wagmi + viem |
| Off-ramp | Bridge.xyz API |

---

## Contract Summary

### `ABRANDPool.sol`
```
deposit(uint256 amount)   — anyone; pulls USDC, mints ABR shares 1:1
redeem(uint256 amount)    — hedge funds only; burns ABR shares, sends USDC 1:1
totalLiquidity()          — returns pool's USDC balance
```

### `AccessRegistry.sol`
```
addHedgeFund(address)     — admin only
removeHedgeFund(address)  — admin only
isHedgeFund(address)      — public view
```

### ABR Token
- ERC-20, symbol `ABR`, 1 ABR = 1 USDC (fixed)
- Minted on deposit, burned on redemption
- Freely transferable — hedge funds acquire via OTC or transfer

---

## Key Design Decisions

- **1:1 fixed peg** — no yield, no NAV math, keeps contracts minimal
- **Redemption is gated** — only whitelisted addresses can call `redeem()`
- **Deposit is open** — no KYC on depositor side
- **KYC lives off-chain** — admin whitelists hedge funds after off-chain verification
- **Bridge.xyz for fiat** — handles USDC → USD wire on the hedge fund side

---

## Repo Structure

```
/
├── CLAUDE.md               # Hackathon rules and stack defaults
├── ABRAND.md               # Full protocol documentation
├── CONTEXT.md              # This file
└── contracts/
    ├── foundry.toml
    ├── remappings.txt
    ├── src/
    │   ├── ABRANDPool.sol
    │   └── AccessRegistry.sol
    ├── test/
    │   └── ABRANDPool.t.sol
    ├── script/
    │   └── Deploy.s.sol
    └── lib/
        └── openzeppelin-contracts/
```

---

## Commands

```bash
# Run tests
cd contracts && forge test -vv

# Deploy to Base Sepolia
forge script script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast --verify

# Start frontend (once scaffolded)
npm run dev
```

---

## Environment Variables Needed

```
PRIVATE_KEY=
ADMIN_ADDRESS=
BASE_SEPOLIA_RPC_URL=
BASE_RPC_URL=
BRIDGEXYZ_API_KEY=
```

---

## What NOT to change

- The 1:1 peg — it's a design choice, not a simplification to fix
- The open deposit / gated redeem split — intentional
- Contract structure — minimal is the goal, do not add complexity without asking
