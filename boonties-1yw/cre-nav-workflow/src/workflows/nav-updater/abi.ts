/**
 * ABIs for on-chain contracts used by the NAV Updater workflow.
 */

/** Minimal FundVault ABI — only the functions we read from the workflow. */
export const FUND_VAULT_ABI = [
  {
    name: "navPerShare",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "navUpdatedAt",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/**
 * NAVConsumer ABI — the contract that receives CRE reports and calls
 * vault.updateNAV(). Deployed as the CRE report receiver.
 */
export const NAV_CONSUMER_ABI = [
  {
    name: "onReport",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "report",
        type: "bytes",
      },
    ],
    outputs: [],
  },
  {
    name: "latestNav",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "lastUpdatedAt",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "NAVReported",
    type: "event",
    inputs: [
      { name: "nav", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
      { name: "nonce", type: "uint256", indexed: false },
    ],
  },
] as const;
