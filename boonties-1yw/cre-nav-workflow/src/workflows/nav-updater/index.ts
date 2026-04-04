/**
 * ABRAND — CRE NAV Updater Workflow
 *
 * Replaces the deprecated Chainlink Functions + Automation NAVOracle with a
 * CRE Workflow that runs on the Chainlink DON.
 *
 * FLOW:
 *   CRE Cron Trigger (every hour)
 *     → HTTP fetch signed NAV payload from auditor server
 *     → Read current navPerShare from FundVault (on-chain read)
 *     → If NAV has changed: writeReport → NAVConsumer.onReport() → vault.updateNAV()
 *
 * The auditor server (oracle/auditor-server.js) produces EIP-712 signed NAV
 * payloads. This workflow relays them on-chain via the CRE DON, which is
 * cryptographically verified by the NAVConsumer contract.
 *
 * BOUNTY: Chainlink CRE — $4,000
 *   Demonstrates a workflow that integrates an external API (auditor server)
 *   with on-chain state (FundVault) using CRE as the orchestration layer.
 */

import {
  cre,
  type Runtime,
  type NodeRuntime,
  type CronPayload,
  getNetwork,
  encodeCallMsg,
  prepareReportRequest,
  text,
  ok,
} from "@chainlink/cre-sdk";
import { encodeAbiParameters, encodeFunctionData, decodeFunctionResult, toHex } from "viem";
import { z } from "zod";
import { FUND_VAULT_ABI, NAV_CONSUMER_ABI } from "./abi.js";

// ── Config schema ─────────────────────────────────────────────────────────────

const EvmConfig = z.object({
  fundVaultAddress: z.string(),
  navConsumerAddress: z.string(),
  chainSelectorName: z.string(),
  gasLimit: z.string(),
});

const ConfigSchema = z.object({
  schedule: z.string(),
  auditorApiUrl: z.string(),
  evms: z.array(EvmConfig),
});

type Config = z.infer<typeof ConfigSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse a JSON body from the auditor server response. */
function parseAuditorResponse(body: string): {
  nav: bigint;
  timestamp: bigint;
  nonce: bigint;
  sig: `0x${string}`;
} {
  const parsed = JSON.parse(body) as {
    nav: string;
    timestamp: string;
    nonce: string;
    sig: string;
  };

  if (!parsed.nav || !parsed.timestamp || !parsed.nonce || !parsed.sig) {
    throw new Error(`Malformed auditor response: ${body}`);
  }

  return {
    nav: BigInt(parsed.nav),
    timestamp: BigInt(parsed.timestamp),
    nonce: BigInt(parsed.nonce),
    sig: parsed.sig as `0x${string}`,
  };
}

/** Read the current navPerShare from FundVault. */
function readCurrentNav(
  runtime: Runtime<Config>,
  evmClient: InstanceType<typeof cre.capabilities.EVMClient>,
  vaultAddress: string,
): bigint {
  // Encode navPerShare() view call
  const calldata = encodeFunctionData({
    abi: FUND_VAULT_ABI,
    functionName: "navPerShare",
  });

  const result = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: "0x0000000000000000000000000000000000000000",
        to: vaultAddress as `0x${string}`,
        data: calldata,
      }),
    })
    .result();

  const onchainNav = decodeFunctionResult({
    abi: FUND_VAULT_ABI,
    functionName: "navPerShare",
    data: toHex(result.data),
  });

  return onchainNav as bigint;
}

// ── Main handler ──────────────────────────────────────────────────────────────

const onCronTrigger = (runtime: Runtime<Config>, _payload: CronPayload): object => {
  const { auditorApiUrl, evms } = runtime.config;

  runtime.log(`[ABRAND NAV Updater] Triggered. Fetching NAV from: ${auditorApiUrl}`);

  // 1. Fetch signed NAV payload from auditor server (runs in node mode for HTTP)
  const httpClient = new cre.capabilities.HTTPClient();
  const response = httpClient
    .sendRequest(runtime as unknown as NodeRuntime<Config>, {
      url: auditorApiUrl,
      method: "GET",
    })
    .result();

  if (!ok(response)) {
    throw new Error(`Auditor API error ${response.statusCode}: ${text(response)}`);
  }

  const { nav, timestamp, nonce, sig } = parseAuditorResponse(text(response));
  runtime.log(
    `[ABRAND NAV Updater] Auditor response: nav=${nav} timestamp=${timestamp} nonce=${nonce}`
  );

  const results: object[] = [];

  for (const evmCfg of evms) {
    const { fundVaultAddress, navConsumerAddress, chainSelectorName, gasLimit } = evmCfg;

    runtime.log(`[ABRAND NAV Updater] Checking chain: ${chainSelectorName}`);

    const networkInfo = getNetwork({ chainSelectorName });
    if (!networkInfo) {
      runtime.log(`[ABRAND NAV Updater] Unknown chain: ${chainSelectorName}, skipping.`);
      continue;
    }
    const evmClient = new cre.capabilities.EVMClient(networkInfo.chainSelector.selector);

    // 2. Read current on-chain navPerShare
    let onchainNav: bigint;
    try {
      onchainNav = readCurrentNav(runtime, evmClient, fundVaultAddress);
      runtime.log(`[ABRAND NAV Updater] On-chain NAV: ${onchainNav}, Auditor NAV: ${nav}`);
    } catch (err) {
      runtime.log(`[ABRAND NAV Updater] WARNING: Could not read on-chain NAV: ${err}`);
      onchainNav = 0n; // Force update if we can't read current value
    }

    // 3. Skip if NAV is unchanged (saves gas, avoids pointless txns)
    if (onchainNav === nav) {
      runtime.log(`[ABRAND NAV Updater] NAV unchanged (${nav}), skipping update.`);
      results.push({ chain: chainSelectorName, action: "skipped", nav: nav.toString() });
      continue;
    }

    // 4. Encode the report payload: (nav, timestamp, nonce, sig)
    //    NAVConsumer.onReport() decodes this and calls vault.updateNAV(nav)
    const reportPayload = encodeAbiParameters(
      [
        { type: "uint256" }, // nav
        { type: "uint256" }, // timestamp
        { type: "uint256" }, // nonce
        { type: "bytes" },   // EIP-712 sig from auditor
      ],
      [nav, timestamp, nonce, sig as `0x${string}`]
    );

    const calldata = encodeFunctionData({
      abi: NAV_CONSUMER_ABI,
      functionName: "onReport",
      args: [reportPayload],
    });

    // 5. Generate CRE-signed report and write to NAVConsumer on-chain
    const reportRequest = prepareReportRequest(calldata);
    const report = runtime.report(reportRequest).result();

    runtime.log(
      `[ABRAND NAV Updater] Submitting NAV update: ${onchainNav} → ${nav} on ${chainSelectorName}`
    );

    const receipt = evmClient
      .writeReport(runtime, {
        receiver: navConsumerAddress,
        report,
        gasConfig: { gasLimit: gasLimit },
      })
      .result();

    runtime.log(
      `[ABRAND NAV Updater] NAV updated. tx=${receipt.txHash}`
    );

    results.push({
      chain: chainSelectorName,
      action: "updated",
      previousNav: onchainNav.toString(),
      newNav: nav.toString(),
      txHash: receipt.txHash,
    });
  }

  return { results };
};

// ── Workflow registration ─────────────────────────────────────────────────────

const initWorkflow = (config: Config) => {
  const cron = new cre.capabilities.CronCapability();
  return [
    cre.handler(
      cron.trigger({ schedule: config.schedule }),
      onCronTrigger
    ),
  ];
};

export { initWorkflow };
