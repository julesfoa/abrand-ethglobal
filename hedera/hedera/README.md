# ABRAND — Hedera Token Service Integration

Real-world asset tokenization of fund shares using Hedera Token Service (HTS). No smart contracts required — all compliance controls, fee schedules, and lifecycle operations are handled natively at the protocol level.

## What it does

ABRAND tokenizes institutional fund shares on Hedera with built-in:

- **KYC gating** — investors must be KYC-granted before holding tokens (maps to investor whitelist)
- **Account freeze** — freeze an investor's holdings during disputes
- **Token pause** — emergency halt of all transfers globally
- **Custom fees** — 2% fractional management fee auto-collected on every transfer
- **Mint/burn** — programmatic share issuance via supply key

## Setup

1. Get a Hedera Testnet account at https://portal.hedera.com
2. Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

3. Install dependencies:

```bash
npm install
```

## Run the full demo

```bash
npm run demo
```

This runs the complete lifecycle in one script:
1. Creates the ABRAND token with all compliance keys + 2% fee
2. Creates a test investor account
3. Associates + KYC-grants + unfreezes investor
4. Mints 10,000 shares
5. Transfers 1,000 to investor (fee auto-deducted)
6. Freezes investor (dispute) → shows transfer rejection
7. Unfreezes (dispute resolved)
8. Pauses all transfers (emergency stop) → unpauses
9. Final balance check

## Individual scripts

| Script | Command | Description |
|--------|---------|-------------|
| Create token | `npm run create-token` | Create ABRAND token with compliance controls |
| KYC grant | `TOKEN_ID=0.0.X ACCOUNT_ID=0.0.Y npm run kyc-grant` | Whitelist an investor |
| Mint | `TOKEN_ID=0.0.X AMOUNT=1000 npm run mint` | Mint shares to treasury |
| Transfer | `TOKEN_ID=0.0.X ACCOUNT_ID=0.0.Y AMOUNT=100 npm run transfer` | Transfer shares |
| Freeze | `TOKEN_ID=0.0.X ACCOUNT_ID=0.0.Y npm run freeze` | Freeze an account |
| Pause | `TOKEN_ID=0.0.X npm run pause` | Pause all transfers |
| Balance | `TOKEN_ID=0.0.X ACCOUNT_ID=0.0.Y npm run balance` | Check balance |

## Architecture

```
Fund Manager (Hedera Account)
    │
    ├── TokenCreateTransaction
    │     ├── KYC Key (investor whitelist)
    │     ├── Freeze Key (dispute mechanism)
    │     ├── Pause Key (emergency stop)
    │     ├── Supply Key (mint/burn)
    │     └── Custom Fee: 2% fractional (management fee)
    │
    ├── TokenGrantKycTransaction → investor whitelisting
    ├── TokenMintTransaction → share issuance
    ├── TransferTransaction → distribution (fee auto-collected)
    ├── TokenFreezeTransaction → dispute / compliance hold
    └── TokenPauseTransaction → global emergency stop
```

## Bounty checklist

- [x] Create, manage, and interact with tokens using HTS (via SDK)
- [x] Deploy and demonstrate on Hedera Testnet
- [x] Source code in public GitHub repo
- [x] KYC grants (compliance control)
- [x] Account freezing (compliance control)
- [x] Token pause (compliance control)
- [x] Custom fractional fee schedule (2% management fee)

## Tech stack

- Hedera JavaScript SDK (`@hashgraph/sdk`)
- Node.js
- Hedera Testnet
