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

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
