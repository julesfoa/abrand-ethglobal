# TODOS

## VaultFactory access control (build now — in this PR)
**What:** Add `DEPLOYER_ROLE` or `onlyOwner` guard on `VaultFactory.deploy()`.
**Why:** Without it, anyone can deploy vaults under the same factory address, creating a phishing surface (fake vaults look legitimate because they share a factory).
**How to apply:** One-line guard on the deploy function. Build now.

## NAV walk-down protection (post-hackathon)
**What:** Add a guard that prevents investors pending in the redemption queue from being progressively harmed by repeated small NAV decreases.
**Why:** The 10% rate cap prevents instant drain but not slow walk-down (10% per call, N calls). Investors who requestRedeem during a walk-down lock in progressively worse terms.
**Depends on:** Core vault architecture (post-hackathon hardening, pre-mainnet).

## USDC blacklisting recovery path (post-hackathon)
**What:** Allow manager to call `cancelRedemption(address user)` on behalf of a Circle-blacklisted user, or implement pull-payment pattern for USDC claims.
**Why:** If a user gets blacklisted by Circle after escrowing shares, `fulfillRedemption` reverts permanently. Shares stuck, no recovery path.
**Depends on:** Core vault architecture (production compliance, pre-mainnet).
