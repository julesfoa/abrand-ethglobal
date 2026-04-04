/**
 * Coinbase Prime REST API client — portfolio equity fetch.
 *
 * Docs: https://docs.cdp.coinbase.com/prime/reference
 *
 * The portfolio equity (total value in USD) is used as the fund NAV source.
 * Returned as a USDC-unit bigint (1e6 = $1.00) to match FundVault.navPerShare.
 *
 * Auth: HMAC-SHA256 over "timestamp + method + requestPath + body".
 */

import crypto from "crypto";

interface CoinbasePrimeConfig {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
  portfolioId: string;
  baseUrl?: string;
}

interface PortfolioBalanceResponse {
  breakdown: {
    total_balance: { value: string; currency: string };
  };
}

function sign(
  secret: string,
  timestamp: string,
  method: string,
  requestPath: string,
  body: string
): string {
  const message = `${timestamp}${method}${requestPath}${body}`;
  return crypto.createHmac("sha256", secret).update(message).digest("base64");
}

/**
 * Fetch total portfolio equity from Coinbase Prime.
 * Returns value in USDC units (1e6 = $1.00).
 */
export async function fetchCoinbasePrimeNAV(
  config: CoinbasePrimeConfig
): Promise<bigint> {
  const baseUrl = config.baseUrl ?? "https://api.prime.coinbase.com";
  const requestPath = `/v1/portfolios/${config.portfolioId}/balances?balance_type=TOTAL_BALANCE&currency=USD`;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const sig = sign(config.apiSecret, timestamp, "GET", requestPath, "");

  const res = await fetch(`${baseUrl}${requestPath}`, {
    headers: {
      "X-CB-ACCESS-KEY": config.apiKey,
      "X-CB-ACCESS-PASSPHRASE": config.passphrase,
      "X-CB-ACCESS-SIGN": sig,
      "X-CB-ACCESS-TIMESTAMP": timestamp,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Coinbase Prime API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as PortfolioBalanceResponse;
  const usdValue = parseFloat(data.breakdown.total_balance.value);

  if (!isFinite(usdValue) || usdValue <= 0) {
    throw new Error(`Invalid equity from Coinbase Prime: ${data.breakdown.total_balance.value}`);
  }

  // Convert USD float → USDC units (1e6 per dollar), round to nearest cent
  return BigInt(Math.round(usdValue * 1e6));
}
