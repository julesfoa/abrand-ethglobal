/**
 * Grant KYC to an investor account — required before they can hold ABRAND tokens.
 * Maps to the INVESTOR_ROLE whitelist in the EVM FundVault.
 *
 * Usage: TOKEN_ID=0.0.XXX ACCOUNT_ID=0.0.YYY node scripts/kycGrant.js
 */
const { TokenGrantKycTransaction, TokenId, AccountId } = require("@hashgraph/sdk");
const { getClient } = require("./client");

async function main() {
  const tokenId = TokenId.fromString(process.env.TOKEN_ID);
  const accountId = AccountId.fromString(process.env.ACCOUNT_ID || process.env.INVESTOR_ACCOUNT_ID);
  const { client } = getClient();

  const tx = await new TokenGrantKycTransaction()
    .setTokenId(tokenId)
    .setAccountId(accountId)
    .execute(client);

  await tx.getReceipt(client);
  console.log(`KYC granted to ${accountId} for token ${tokenId}`);
  client.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
