/**
 * ABRAND — Full E2E Demo on Hedera Testnet
 *
 * Runs the complete fund share lifecycle:
 *   1. Create ABRAND token with compliance controls + 2% management fee
 *   2. Create a test investor account
 *   3. Associate investor with token
 *   4. Grant KYC to investor (whitelist)
 *   5. Unfreeze investor (accounts frozen by default)
 *   6. Mint 10,000 shares to treasury
 *   7. Transfer 1,000 shares to investor (2% fee auto-collected)
 *   8. Check balances
 *   9. Freeze investor (dispute)
 *  10. Attempt transfer while frozen (should fail)
 *  11. Unfreeze investor (resolve dispute)
 *  12. Pause token globally (emergency stop)
 *  13. Unpause token
 *  14. Final balance check
 */
const {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TokenGrantKycTransaction,
  TokenFreezeTransaction,
  TokenUnfreezeTransaction,
  TokenPauseTransaction,
  TokenUnpauseTransaction,
  TokenAssociateTransaction,
  TransferTransaction,
  AccountCreateTransaction,
  AccountBalanceQuery,
  CustomFractionalFee,
  Hbar,
  PrivateKey,
} = require("@hashgraph/sdk");
const { getClient } = require("./client");

const DECIMALS = 6;
const unit = (n) => n * 10 ** DECIMALS;
const fmt = (n) => (Number(n) / 10 ** DECIMALS).toFixed(DECIMALS);

function step(n, msg) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Step ${n}: ${msg}`);
  console.log("=".repeat(60));
}

async function main() {
  const { client, operatorId, operatorKey } = getClient();

  // ── Step 1: Create token ──────────────────────────────────────
  step(1, "Create ABRAND Fund Share token with compliance controls");

  const managementFee = new CustomFractionalFee()
    .setNumerator(2)
    .setDenominator(100)
    .setFeeCollectorAccountId(operatorId);

  const createTx = await new TokenCreateTransaction()
    .setTokenName("ABRAND Fund Shares")
    .setTokenSymbol("ABRAND")
    .setTokenType(TokenType.FungibleCommon)
    .setDecimals(DECIMALS)
    .setInitialSupply(0)
    .setSupplyType(TokenSupplyType.Infinite)
    .setTreasuryAccountId(operatorId)
    .setAdminKey(operatorKey.publicKey)
    .setKycKey(operatorKey.publicKey)
    .setFreezeKey(operatorKey.publicKey)
    .setPauseKey(operatorKey.publicKey)
    .setSupplyKey(operatorKey.publicKey)
    .setCustomFees([managementFee])
    .setFreezeDefault(true)
    .freezeWith(client)
    .sign(operatorKey);

  const createResp = await createTx.execute(client);
  const createReceipt = await createResp.getReceipt(client);
  const tokenId = createReceipt.tokenId;

  console.log("Token ID:", tokenId.toString());
  console.log("HashScan: https://hashscan.io/testnet/token/" + tokenId);
  console.log("Compliance: KYC key, Freeze key, Pause key, Supply key");
  console.log("Fee: 2% fractional management fee on transfers");
  console.log("Freeze default: ON (must KYC-grant before holding)");

  // ── Step 2: Create investor account ───────────────────────────
  step(2, "Create test investor account");

  const investorKey = PrivateKey.generateED25519();
  const investorTx = await new AccountCreateTransaction()
    .setKey(investorKey.publicKey)
    .setInitialBalance(new Hbar(10))
    .execute(client);
  const investorReceipt = await investorTx.getReceipt(client);
  const investorId = investorReceipt.accountId;

  console.log("Investor account:", investorId.toString());

  // ── Step 3: Associate investor with token ─────────────────────
  step(3, "Associate investor with ABRAND token");

  const assocTx = await new TokenAssociateTransaction()
    .setAccountId(investorId)
    .setTokenIds([tokenId])
    .freezeWith(client)
    .sign(investorKey);
  await (await assocTx.execute(client)).getReceipt(client);

  console.log("Investor associated with ABRAND token");

  // ── Step 4: KYC grant ─────────────────────────────────────────
  step(4, "Grant KYC to investor (whitelist for fund participation)");

  await (
    await new TokenGrantKycTransaction()
      .setTokenId(tokenId)
      .setAccountId(investorId)
      .execute(client)
  ).getReceipt(client);

  console.log("KYC granted to", investorId.toString());

  // ── Step 5: Unfreeze investor ─────────────────────────────────
  step(5, "Unfreeze investor account (clear default freeze)");

  await (
    await new TokenUnfreezeTransaction()
      .setTokenId(tokenId)
      .setAccountId(investorId)
      .execute(client)
  ).getReceipt(client);

  console.log("Investor unfrozen — can now receive ABRAND shares");

  // ── Step 6: Mint shares ───────────────────────────────────────
  step(6, "Mint 10,000 ABRAND shares to treasury");

  const mintTx = await new TokenMintTransaction()
    .setTokenId(tokenId)
    .setAmount(unit(10000))
    .execute(client);
  const mintReceipt = await mintTx.getReceipt(client);

  console.log("Total supply:", fmt(mintReceipt.totalSupply), "ABRAND");

  // ── Step 7: Transfer to investor ──────────────────────────────
  step(7, "Transfer 1,000 shares to investor (2% fee auto-deducted)");

  const transferTx = await new TransferTransaction()
    .addTokenTransfer(tokenId, operatorId, -unit(1000))
    .addTokenTransfer(tokenId, investorId, unit(1000))
    .freezeWith(client)
    .sign(investorKey);
  await (await transferTx.execute(client)).getReceipt(client);

  console.log("Transferred 1,000 ABRAND to investor");

  // ── Step 8: Check balances ────────────────────────────────────
  step(8, "Check balances after transfer");

  const treasuryBal = await new AccountBalanceQuery().setAccountId(operatorId).execute(client);
  const investorBal = await new AccountBalanceQuery().setAccountId(investorId).execute(client);

  const tBal = treasuryBal.tokens.get(tokenId);
  const iBal = investorBal.tokens.get(tokenId);
  console.log("Treasury:", fmt(tBal), "ABRAND");
  console.log("Investor:", fmt(iBal), "ABRAND");
  console.log("(Difference from 9000/1000 = 2% fee collected by treasury)");

  // ── Step 9: Freeze investor (dispute) ─────────────────────────
  step(9, "Freeze investor account (dispute mechanism)");

  await (
    await new TokenFreezeTransaction()
      .setTokenId(tokenId)
      .setAccountId(investorId)
      .execute(client)
  ).getReceipt(client);

  console.log("Investor FROZEN — cannot transfer ABRAND shares");

  // ── Step 10: Attempt transfer while frozen ────────────────────
  step(10, "Attempt transfer while frozen (should fail)");

  try {
    const failTx = await new TransferTransaction()
      .addTokenTransfer(tokenId, operatorId, -unit(100))
      .addTokenTransfer(tokenId, investorId, unit(100))
      .freezeWith(client)
      .sign(investorKey);
    await (await failTx.execute(client)).getReceipt(client);
    console.log("ERROR: transfer should have failed!");
  } catch (err) {
    console.log("Transfer correctly rejected:", err.message.split("\n")[0]);
  }

  // ── Step 11: Unfreeze (resolve dispute) ───────────────────────
  step(11, "Unfreeze investor (dispute resolved)");

  await (
    await new TokenUnfreezeTransaction()
      .setTokenId(tokenId)
      .setAccountId(investorId)
      .execute(client)
  ).getReceipt(client);

  console.log("Investor unfrozen — dispute resolved");

  // ── Step 12: Pause token (emergency stop) ─────────────────────
  step(12, "Pause ABRAND token globally (emergency stop)");

  await (
    await new TokenPauseTransaction().setTokenId(tokenId).execute(client)
  ).getReceipt(client);

  console.log("All ABRAND transfers PAUSED globally");

  // ── Step 13: Unpause token ────────────────────────────────────
  step(13, "Unpause ABRAND token");

  await (
    await new TokenUnpauseTransaction().setTokenId(tokenId).execute(client)
  ).getReceipt(client);

  console.log("ABRAND transfers resumed");

  // ── Step 14: Final balance check ──────────────────────────────
  step(14, "Final balance check");

  const finalTreasury = await new AccountBalanceQuery().setAccountId(operatorId).execute(client);
  const finalInvestor = await new AccountBalanceQuery().setAccountId(investorId).execute(client);

  console.log("Treasury:", fmt(finalTreasury.tokens.get(tokenId)), "ABRAND");
  console.log("Investor:", fmt(finalInvestor.tokens.get(tokenId)), "ABRAND");

  console.log(`\n${"=".repeat(60)}`);
  console.log("  DEMO COMPLETE");
  console.log("=".repeat(60));
  console.log("\nToken:", tokenId.toString());
  console.log("HashScan: https://hashscan.io/testnet/token/" + tokenId);
  console.log("\nCompliance controls demonstrated:");
  console.log("  - KYC grant (investor whitelist)");
  console.log("  - Account freeze/unfreeze (dispute mechanism)");
  console.log("  - Token pause/unpause (emergency stop)");
  console.log("  - Custom fractional fee (2% management fee)");
  console.log("  - Mint (share issuance)");
  console.log("  - Transfer with compliance checks");

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
