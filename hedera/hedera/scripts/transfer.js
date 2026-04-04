/**
 * Transfer ABRAND shares from treasury to an investor.
 * The investor must have KYC granted and not be frozen.
 * A 2% management fee is auto-deducted by the custom fee schedule.
 *
 * Usage: TOKEN_ID=0.0.XXX ACCOUNT_ID=0.0.YYY AMOUNT=100 node scripts/transfer.js
 */
const { TransferTransaction, TokenId, AccountId } = require("@hashgraph/sdk");
const { getClient } = require("./client");

async function main() {
  const tokenId = TokenId.fromString(process.env.TOKEN_ID);
  const toAccount = AccountId.fromString(process.env.ACCOUNT_ID || process.env.INVESTOR_ACCOUNT_ID);
  const amount = parseInt(process.env.AMOUNT || "100") * 1e6; // 6 decimals
  const { client, operatorId } = getClient();

  const tx = await new TransferTransaction()
    .addTokenTransfer(tokenId, operatorId, -amount)
    .addTokenTransfer(tokenId, toAccount, amount)
    .execute(client);

  const receipt = await tx.getReceipt(client);
  console.log(`Transferred ${process.env.AMOUNT || 100} ABRAND to ${toAccount}`);
  console.log("Status:", receipt.status.toString());
  client.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
