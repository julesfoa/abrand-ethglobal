// Chainlink Functions source — runs inside the DON sandbox.
//
// args[0]  = auditor server URL, e.g. "https://your-server.com/nav"
//
// Returns: abi.encode(uint256 nav, uint256 timestamp, uint256 nonce, bytes sig)
// This matches the fulfillRequest() decoder in NAVOracle.sol.

const apiUrl = args[0];
if (!apiUrl) throw new Error("args[0] must be the auditor API URL");

const res = await Functions.makeHttpRequest({ url: apiUrl, timeout: 9000 });
if (res.error) throw new Error(`HTTP error: ${JSON.stringify(res.error)}`);

const { nav, timestamp, nonce, sig } = res.data;
if (!nav || !timestamp || !nonce || !sig) {
  throw new Error(`Bad response: ${JSON.stringify(res.data)}`);
}

// ── Manual ABI encoding for (uint256, uint256, uint256, bytes) ──────────────
//
// ABI layout:
//   [0-31]   nav
//   [32-63]  timestamp
//   [64-95]  nonce
//   [96-127] offset to `bytes` data = 128 (always, since 4 head slots × 32)
//   [128-159] length of sig bytes
//   [160-...] sig bytes, zero-padded to next 32-byte boundary

function uint256ToBytes32(val) {
  const hex = BigInt(val).toString(16).padStart(64, "0");
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function hexToBytes(hex) {
  const clean = hex.replace(/^0x/i, "");
  if (clean.length % 2 !== 0) throw new Error("hex length must be even");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

const sigBytes = hexToBytes(sig);
const sigPaddedLen = Math.ceil(sigBytes.length / 32) * 32;
const sigPadded = new Uint8Array(sigPaddedLen); // zero-initialised
sigPadded.set(sigBytes);

// Total: 5 × 32-byte head/length slots + padded sig
const encoded = new Uint8Array(160 + sigPaddedLen);
let pos = 0;

encoded.set(uint256ToBytes32(nav), pos);       pos += 32; // nav
encoded.set(uint256ToBytes32(timestamp), pos); pos += 32; // timestamp
encoded.set(uint256ToBytes32(nonce), pos);     pos += 32; // nonce
encoded.set(uint256ToBytes32(128), pos);       pos += 32; // offset to bytes = 128
encoded.set(uint256ToBytes32(sigBytes.length), pos); pos += 32; // sig length
encoded.set(sigPadded, pos);                           // sig data

return encoded;
