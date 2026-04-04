/**
 * Creates the ABRAND Fund Share token on Hedera via HTS.
 *
 * Compliance controls:
 *   - KYC key: investors must be KYC-granted before receiving tokens
 *   - Freeze key: freeze an investor's account (dispute mechanism)
 *   - Pause key: halt all transfers globally
 *   - Supply key: mint/burn shares
 *   - Admin key: update token properties
 *
 * Custom fee schedule:
 *   - 2% fractional fee on every transfer (management fee) collected by treasury
 */
const {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  CustomFractionalFee,
} = require("@hashgraph/sdk");
const { getClient } = require("./client");

async function main() {
  const { client, operatorId, operatorKey } = getClient();

  // 2% management fee on transfers, collected by treasury (operator)
  const managementFee = new CustomFractionalFee()
    .setNumerator(2)
    .setDenominator(100)
    .setFeeCollectorAccountId(operatorId);

  const tx = new TokenCreateTransaction()
    .setTokenName("ABRAND Fund Shares")
    .setTokenSymbol("ABRAND")
    .setTokenType(TokenType.FungibleCommon)
    .setDecimals(6)
    .setInitialSupply(0)
    .setSupplyType(TokenSupplyType.Infinite)
    .setTreasuryAccountId(operatorId)
    // Compliance keys
    .setAdminKey(operatorKey.publicKey)
    .setKycKey(operatorKey.publicKey)
    .setFreezeKey(operatorKey.publicKey)
    .setPauseKey(operatorKey.publicKey)
    .setSupplyKey(operatorKey.publicKey)
    // Custom fee schedule
    .setCustomFees([managementFee])
    .setFreezeDefault(true); // accounts frozen by default — must KYC-grant first

  const signed = await tx.freezeWith(client).sign(operatorKey);
  const resp = await signed.execute(client);
  const receipt = await resp.getReceipt(client);

  console.log("Token created!");
  console.log("Token ID:", receipt.tokenId.toString());
  console.log("View on HashScan: https://hashscan.io/testnet/token/" + receipt.tokenId.toString());
  console.log("\nSave this token ID — pass it as TOKEN_ID env var to other scripts.");

  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
