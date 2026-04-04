/**
 * Check ABRAND token balance for an account.
 *
 * Usage: TOKEN_ID=0.0.XXX ACCOUNT_ID=0.0.YYY node scripts/balance.js
 */
const { AccountBalanceQuery, TokenId, AccountId } = require("@hashgraph/sdk");
const { getClient } = require("./client");

async function main() {
  const tokenId = TokenId.fromString(process.env.TOKEN_ID);
  const accountId = AccountId.fromString(
    process.env.ACCOUNT_ID || process.env.INVESTOR_ACCOUNT_ID || process.env.HEDERA_ACCOUNT_ID
  );
  const { client } = getClient();

  const balance = await new AccountBalanceQuery()
    .setAccountId(accountId)
    .execute(client);

  const tokenBalance = balance.tokens.get(tokenId);
  const formatted = tokenBalance ? (Number(tokenBalance) / 1e6).toFixed(6) : "0";
  console.log(`Account ${accountId} holds ${formatted} ABRAND`);
  console.log("HBAR balance:", balance.hbars.toString());
  client.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
