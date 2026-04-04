require("dotenv").config({ path: __dirname + "/../.env" });
const { Client, AccountId, PrivateKey } = require("@hashgraph/sdk");

function getClient() {
  const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
  const privateKey = PrivateKey.fromStringED25519(process.env.HEDERA_PRIVATE_KEY);

  const client = Client.forTestnet();
  client.setOperator(accountId, privateKey);
  return { client, operatorId: accountId, operatorKey: privateKey };
}

function getInvestorKey() {
  return {
    investorId: AccountId.fromString(process.env.INVESTOR_ACCOUNT_ID),
    investorKey: PrivateKey.fromStringED25519(process.env.INVESTOR_PRIVATE_KEY),
  };
}

module.exports = { getClient, getInvestorKey };
