/**
 * Freeze or unfreeze an investor's ABRAND token account.
 * Maps to the dispute mechanism in the EVM FundVault.
 *
 * Usage:
 *   Freeze:   TOKEN_ID=0.0.XXX ACCOUNT_ID=0.0.YYY node scripts/freeze.js
 *   Unfreeze: TOKEN_ID=0.0.XXX ACCOUNT_ID=0.0.YYY UNFREEZE=1 node scripts/freeze.js
 */
const {
  TokenFreezeTransaction,
  TokenUnfreezeTransaction,
  TokenId,
  AccountId,
} = require("@hashgraph/sdk");
const { getClient } = require("./client");

async function main() {
  const tokenId = TokenId.fromString(process.env.TOKEN_ID);
  const accountId = AccountId.fromString(process.env.ACCOUNT_ID || process.env.INVESTOR_ACCOUNT_ID);
  const unfreeze = process.env.UNFREEZE === "1";
  const { client } = getClient();

  const TxClass = unfreeze ? TokenUnfreezeTransaction : TokenFreezeTransaction;
  const tx = await new TxClass()
    .setTokenId(tokenId)
    .setAccountId(accountId)
    .execute(client);

  await tx.getReceipt(client);
  console.log(`${unfreeze ? "Unfroze" : "Froze"} account ${accountId} for token ${tokenId}`);
  client.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
