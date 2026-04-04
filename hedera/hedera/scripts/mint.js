/**
 * Mint ABRAND fund shares to the treasury.
 *
 * Usage: TOKEN_ID=0.0.XXX AMOUNT=1000 node scripts/mint.js
 */
const { TokenMintTransaction, TokenId } = require("@hashgraph/sdk");
const { getClient } = require("./client");

async function main() {
  const tokenId = TokenId.fromString(process.env.TOKEN_ID);
  const amount = parseInt(process.env.AMOUNT || "1000") * 1e6; // 6 decimals
  const { client } = getClient();

  const tx = await new TokenMintTransaction()
    .setTokenId(tokenId)
    .setAmount(amount)
    .execute(client);

  const receipt = await tx.getReceipt(client);
  console.log(`Minted ${process.env.AMOUNT || 1000} ABRAND shares`);
  console.log("New total supply:", receipt.totalSupply.toString());
  client.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
