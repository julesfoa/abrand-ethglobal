/**
 * Pause or unpause all ABRAND token transfers globally.
 * Emergency stop for the entire fund.
 *
 * Usage:
 *   Pause:   TOKEN_ID=0.0.XXX node scripts/pause.js
 *   Unpause: TOKEN_ID=0.0.XXX UNPAUSE=1 node scripts/pause.js
 */
const { TokenPauseTransaction, TokenUnpauseTransaction, TokenId } = require("@hashgraph/sdk");
const { getClient } = require("./client");

async function main() {
  const tokenId = TokenId.fromString(process.env.TOKEN_ID);
  const unpause = process.env.UNPAUSE === "1";
  const { client } = getClient();

  const TxClass = unpause ? TokenUnpauseTransaction : TokenPauseTransaction;
  const tx = await new TxClass()
    .setTokenId(tokenId)
    .execute(client);

  await tx.getReceipt(client);
  console.log(`Token ${tokenId} ${unpause ? "unpaused" : "paused"}`);
  client.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
