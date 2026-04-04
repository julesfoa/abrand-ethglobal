# ETHGlobal Cannes Hackathon — ABRAND

## Context
This is a hackathon project. Speed > perfection. Ship working code fast.

## Priorities
- Working > elegant
- Ship > refactor
- Minimal dependencies unless they save significant time

## Stack Defaults (update as decided)
- Frontend: Next.js / React + Tailwind
- Smart Contracts: Solidity + Foundry (or Hardhat)
- Web3: viem / wagmi / ethers.js
- Backend: Node.js / FastAPI if needed

## Key Commands
- `forge test` — run contract tests
- `anvil` — local EVM node
- `cast send` — send txs from CLI
- `npm run dev` — start frontend dev server

## Rules
- Always use environment variables for private keys / API keys (never hardcode)
- Keep contract logic minimal and auditable
- Use OpenZeppelin contracts where possible
- Comment non-obvious Solidity logic

## Hackathon Tips
- Use `/commit` to commit progress checkpoints
- Use `/simplify` after a feature is working to clean up
