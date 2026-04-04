/**
 * Binance sub-account equity fetch.
 *
 * Docs: https://binance-docs.github.io/apidocs/spot/en/#query-sub-account-assets-for-master-account-sapi
 *
 * For SMA model: each investor maps to a Binance sub-account.
 * This fetches total BTC/USDT value across all assets in the sub-account,
 * converts to USD, returns in USDC units (1e6 = $1.00).
 *
 * Auth: HMAC-SHA256 query-string signature.
 */

import crypto from "crypto";

interface BinanceConfig {
  apiKey: string;
  apiSecret: string;
  subAccountEmail: string;
  baseUrl?: string;
}

interface BinanceSubAccountAsset {
  asset: string;
  free: string;
  locked: string;
  btcValue: string; // BTC-denominated value
}

interface BinanceBTCPriceResponse {
  price: string;
}

function hmacSign(secret: string, queryString: string): string {
  return crypto.createHmac("sha256", secret).update(queryString).digest("hex");
}

function buildQuery(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
}

/**
 * Fetch sub-account equity from Binance.
 * Returns value in USDC units (1e6 = $1.00).
 */
export async function fetchBinanceSubAccountNAV(
  config: BinanceConfig
): Promise<bigint> {
  const baseUrl = config.baseUrl ?? "https://api.binance.com";

  // 1. Fetch sub-account asset balances
  const timestamp = Date.now();
  const assetParams = buildQuery({ email: config.subAccountEmail, timestamp });
  const assetSig = hmacSign(config.apiSecret, assetParams);

  const assetRes = await fetch(
    `${baseUrl}/sapi/v1/sub-account/assets?${assetParams}&signature=${assetSig}`,
    { headers: { "X-MBX-APIKEY": config.apiKey } }
  );

  if (!assetRes.ok) {
    const text = await assetRes.text();
    throw new Error(`Binance sub-account assets error ${assetRes.status}: ${text}`);
  }

  const { assetList } = (await assetRes.json()) as { assetList: BinanceSubAccountAsset[] };

  // Sum total BTC value across all assets
  const totalBTC = assetList.reduce((sum, a) => sum + parseFloat(a.btcValue), 0);

  if (totalBTC <= 0) return BigInt(0);

  // 2. Fetch BTC/USDT spot price to convert to USD
  const priceRes = await fetch(`${baseUrl}/api/v3/ticker/price?symbol=BTCUSDT`);
  if (!priceRes.ok) throw new Error("Failed to fetch BTC/USDT price from Binance");

  const { price: btcPriceStr } = (await priceRes.json()) as BinanceBTCPriceResponse;
  const btcPrice = parseFloat(btcPriceStr);

  const usdValue = totalBTC * btcPrice;

  // Convert USD → USDC units (1e6 = $1.00)
  return BigInt(Math.round(usdValue * 1e6));
}
