import { HORIZON_URL, USDC_CODE, USDC_ISSUER } from "./config";

/** Classic USDC balance from Horizon, as a decimal string. null = no trustline / account. */
export async function usdcBalance(address: string): Promise<string | null> {
  const r = await fetch(`${HORIZON_URL}/accounts/${address}`);
  if (!r.ok) return null;
  const j = await r.json();
  const b = (j.balances as { asset_code?: string; asset_issuer?: string; balance: string }[]).find(
    (x) => x.asset_code === USDC_CODE && x.asset_issuer === USDC_ISSUER,
  );
  return b ? b.balance : null;
}
