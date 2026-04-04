/**
 * EIP-712 NAV payload signer.
 *
 * Produces the signed payload that NAVOracle.fulfillRequest() consumes:
 *   ABI-encoded (uint256 nav, uint256 timestamp, uint256 nonce, bytes sig)
 *
 * The EIP-712 domain must exactly match NAVOracle constructor:
 *   name: "NAVOracle", version: "1", chainId, verifyingContract: oracle
 *
 * Usage (standalone):
 *   tsx src/sign-nav.ts --nav 1050000 --chain arc
 */

import { privateKeyToAccount } from "viem/accounts";
import { encodeAbiParameters, parseAbiParameters } from "viem";

export interface NAVPayload {
  nav: bigint;
  timestamp: bigint;
  nonce: bigint;
  sig: `0x${string}`;
}

export interface SignerConfig {
  auditorPrivateKey: `0x${string}`;
  vaultAddress: `0x${string}`;
  oracleAddress: `0x${string}`;
  chainId: number;
}

/**
 * Sign a NAV update with EIP-712. Returns the ABI-encoded bytes that
 * MockFunctionsRouter.fulfillRequest() (or Chainlink DON) passes to
 * NAVOracle.fulfillRequest().
 */
export async function signNAVPayload(
  config: SignerConfig,
  nav: bigint,
  nonce: bigint
): Promise<{ payload: NAVPayload; encoded: `0x${string}` }> {
  const account = privateKeyToAccount(config.auditorPrivateKey);
  const timestamp = BigInt(Math.floor(Date.now() / 1000));

  const domain = {
    name: "NAVOracle",
    version: "1",
    chainId: config.chainId,
    verifyingContract: config.oracleAddress,
  } as const;

  const types = {
    NAVUpdate: [
      { name: "vault",     type: "address" },
      { name: "nav",       type: "uint256" },
      { name: "timestamp", type: "uint256" },
      { name: "nonce",     type: "uint256" },
    ],
  } as const;

  const message = {
    vault:     config.vaultAddress,
    nav,
    timestamp,
    nonce,
  };

  const sig = await account.signTypedData({ domain, types, primaryType: "NAVUpdate", message });

  const encoded = encodeAbiParameters(
    parseAbiParameters("uint256, uint256, uint256, bytes"),
    [nav, timestamp, nonce, sig]
  );

  return {
    payload: { nav, timestamp, nonce, sig },
    encoded,
  };
}

// ── CLI entry point ──────────────────────────────────────────────────────────
// tsx src/sign-nav.ts --nav 1050000 --chain arc
if (process.argv[1].endsWith("sign-nav.ts")) {
  const args = Object.fromEntries(
    process.argv
      .slice(2)
      .filter((_, i, a) => a[i].startsWith("--"))
      .map((a) => [a.slice(2), process.argv[process.argv.indexOf(a) + 1]])
  );

  const nav = BigInt(args["nav"] ?? process.env.DEMO_NAV_OVERRIDE ?? "1050000");
  const chain = args["chain"] ?? "arc";

  const config: SignerConfig = {
    auditorPrivateKey: process.env.AUDITOR_PRIVATE_KEY as `0x${string}`,
    vaultAddress: (chain === "arc"
      ? process.env.ARC_VAULT_ADDRESS
      : process.env.BASE_VAULT_ADDRESS) as `0x${string}`,
    oracleAddress: (chain === "arc"
      ? process.env.ARC_ORACLE_ADDRESS
      : process.env.BASE_ORACLE_ADDRESS) as `0x${string}`,
    chainId: chain === "arc" ? 5042002 : 84532,
  };

  const nonce = BigInt(Date.now()); // crude nonce for CLI use

  const { payload, encoded } = await signNAVPayload(config, nav, nonce);

  console.log("Signed NAV payload:");
  console.log("  nav:      ", payload.nav.toString(), `($${(Number(payload.nav) / 1e6).toFixed(6)})`);
  console.log("  timestamp:", payload.timestamp.toString());
  console.log("  nonce:    ", payload.nonce.toString());
  console.log("  sig:      ", payload.sig);
  console.log("\nABI-encoded response (pass to MockFunctionsRouter.fulfillRequest):");
  console.log(encoded);
}
