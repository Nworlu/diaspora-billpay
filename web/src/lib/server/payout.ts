import "server-only";
import { anchorAuth, getAnchorTx, payAnchor, startWithdraw, type AnchorTx } from "../anchor-core";
import { ANCHOR_MAX, DECIMALS } from "../config";
import { getManaged, keypairFor, setManaged } from "./managed";
import { signerFor } from "./chain";

/** Start (or resume) the naira cash-out for one payment, using the wallet we hold for the provider. */
export async function startPayout(provider: string, paymentId: string, amountUnits: bigint) {
  const kp = keypairFor(provider);
  const existing = getManaged(provider)?.anchorTx?.[paymentId];
  const token = await anchorAuth(provider, signerFor(kp));
  if (existing) {
    const t = await getAnchorTx(token, existing.anchorId);
    // Still waiting on bank details: start a fresh window (the old interactive link expires). Otherwise it's in flight.
    if (!["error", "expired", "refunded", "incomplete"].includes(t.status)) return { anchorId: existing.anchorId, url: t.more_info_url, status: t.status };
  }
  const whole = Number(amountUnits) / 10 ** DECIMALS;
  const amount = Math.min(whole, ANCHOR_MAX).toFixed(2);
  const w = await startWithdraw(token, provider, amount);
  const m = getManaged(provider)!;
  setManaged(provider, { anchorTx: { ...(m.anchorTx ?? {}), [paymentId]: { anchorId: w.id } } });
  return { anchorId: w.id, url: w.url, status: "incomplete" };
}

/** Check the anchor; when it's ready for the USDC, send it automatically (once). */
export async function advancePayout(provider: string, paymentId: string): Promise<(AnchorTx & { paidHash?: string }) | null> {
  const rec = getManaged(provider)?.anchorTx?.[paymentId];
  if (!rec) return null;
  const kp = keypairFor(provider);
  const token = await anchorAuth(provider, signerFor(kp));
  const t = await getAnchorTx(token, rec.anchorId);
  if (t.status === "pending_user_transfer_start" && !rec.paidHash) {
    const hash = await payAnchor(provider, t, signerFor(kp));
    const m = getManaged(provider)!;
    setManaged(provider, { anchorTx: { ...m.anchorTx, [paymentId]: { ...rec, paidHash: hash } } });
    return { ...t, status: "pending_user_transfer_complete", paidHash: hash };
  }
  return { ...t, paidHash: rec.paidHash };
}
