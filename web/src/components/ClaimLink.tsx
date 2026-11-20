"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CategoryIcon, Shield, External, Check } from "./icons";
import { AnchorProgress } from "./AnchorProgress";
import { findProvider } from "@/lib/providers";
import { fmtDate, money, short } from "@/lib/format";
import { ANCHOR_MAX } from "@/lib/config";
import type { AnchorTx } from "@/lib/anchor-core";

type Data = {
  payment: { id: string; sender: string; provider: string; amount: string; invoice_ref: string; deadline: string; status: string };
  managed: boolean;
  mode: "naira" | "hold";
  payout: (AnchorTx & { paidHash?: string }) | null;
};

/** The page a school/hospital/landlord opens from a link. No wallet, no crypto: accept and get naira. */
export function ClaimLink() {
  const { id } = useParams<{ id: string }>();
  const t = useSearchParams().get("t") ?? "";
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<"naira" | "hold">("naira");
  const [busy, setBusy] = useState(false);
  const [anchorUrl, setAnchorUrl] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/claim/${id}?t=${t}`).then((r) => r.json());
    if (r.error) throw new Error(r.error);
    setD(r);
    return r as Data;
  }, [id, t]);
  useEffect(() => { load().then((r) => setMode(r.mode === "hold" ? "hold" : "naira")).catch((e) => setErr(e.message)); }, [load]);

  const poll = useCallback(() => {
    if (timer.current) return;
    timer.current = setInterval(async () => {
      const r = await fetch(`/api/anchor/${id}?t=${t}`).then((r) => r.json()).catch(() => null);
      if (r?.payout) setD((cur) => (cur ? { ...cur, payout: r.payout } : cur));
      if (["completed", "error", "refunded", "expired"].includes(r?.payout?.status)) { clearInterval(timer.current!); timer.current = null; }
    }, 5000);
  }, [id, t]);
  useEffect(() => { if (d?.payout && !["completed", "error", "refunded", "expired"].includes(d.payout.status)) poll(); }, [d?.payout, poll]);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const accept = async () => {
    setBusy(true); setErr(null);
    const win = mode === "naira" ? window.open("about:blank", "anchor", "width=500,height=760") : null;
    try {
      const r = await fetch(`/api/claim/${id}?t=${t}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode }) }).then((r) => r.json());
      if (r.error) throw new Error(r.error);
      if (r.payout?.url) { setAnchorUrl(r.payout.url); if (win) win.location.href = r.payout.url; } else win?.close();
      await load();
      poll();
    } catch (e) { win?.close(); setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  if (err && !d) return <p className="mx-auto max-w-md text-red-600">{err}</p>;
  if (!d) return <p className="text-slate-500">Loading…</p>;

  const p = d.payment;
  const prov = findProvider(p.provider);
  const amount = money(BigInt(p.amount));
  const over = Number(p.amount) / 1e7 > ANCHOR_MAX;
  const claimed = p.status === "Released";
  const expired = p.status === "Pending" && Number(p.deadline) < Date.now() / 1000;

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="card overflow-hidden">
        <div className="space-y-3 p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><CategoryIcon category={prov?.category ?? "School"} /></span>
            <div>
              <p className="font-semibold">{prov?.name ?? short(p.provider)}</p>
              <p className="flex items-center gap-1 text-xs text-brand-700"><Shield className="h-3.5 w-3.5" />Verified {(prov?.category ?? "provider").toLowerCase()}</p>
            </div>
          </div>
          <p className="pt-2 text-sm text-slate-600">You&apos;ve been paid</p>
          <p className="font-display text-5xl font-semibold">${amount}</p>
          <p className="text-slate-700">for <b>{p.invoice_ref}</b>, sent from abroad by <span className="font-mono text-sm">{short(p.sender)}</span>. It&apos;s held safely until you accept it{p.status === "Pending" ? ` by ${fmtDate(BigInt(p.deadline))}` : ""}.</p>
        </div>

        {p.status === "Refunded" ? (
          <p className="border-t bg-slate-50 p-6 text-sm text-slate-600">This payment was returned to the sender because it wasn&apos;t accepted in time.</p>
        ) : !d.managed ? (
          <p className="border-t bg-slate-50 p-6 text-sm text-slate-600">This provider uses its own Stellar wallet. Open the Provider page and connect Freighter to claim it.</p>
        ) : expired ? (
          <p className="border-t bg-slate-50 p-6 text-sm text-slate-600">The window to accept this payment has closed, so the sender can take it back.</p>
        ) : !claimed || !d.payout ? (
          <div className="space-y-4 border-t p-6">
            {!claimed && (
              <>
                <p className="text-sm font-medium">How do you want to receive it?</p>
                <div className="grid gap-2">
                  {[
                    { v: "naira" as const, t: "Naira to my bank account", s: "Recommended. Converted by a licensed Stellar anchor." },
                    { v: "hold" as const, t: "Keep it in US dollars (USDC)", s: "Held in your wallet with us. Cash out whenever you like." },
                  ].map((o) => (
                    <button key={o.v} onClick={() => setMode(o.v)}
                      className={`rounded-xl border p-3 text-left ${mode === o.v ? "border-brand-600 bg-brand-50/60 ring-1 ring-brand-600" : "border-slate-200"}`}>
                      <p className="font-medium">{o.t}</p><p className="text-xs text-slate-600">{o.s}</p>
                    </button>
                  ))}
                </div>
                {mode === "naira" && over && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">The test anchor pays out at most {ANCHOR_MAX} USDC at a time, so {ANCHOR_MAX} goes to your bank now and the rest stays in your wallet.</p>}
              </>
            )}
            {claimed && <p className="text-sm text-slate-700">Already accepted. {d.mode === "hold" ? "It's in your USDC wallet." : ""}</p>}
            {(!claimed || d.mode === "naira") && (
              <button onClick={accept} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-60">
                {busy ? "Working…" : claimed ? "Cash out to my bank" : mode === "naira" ? <>Accept and add bank details <External className="h-4 w-4" /></> : "Accept payment"}
              </button>
            )}
            <p className="text-xs text-slate-500">No crypto wallet or app needed. {mode === "naira" ? "The anchor's window asks for your bank details and runs its own checks." : ""}</p>
          </div>
        ) : (
          <div className="space-y-3 border-t p-6">
            <p className="flex items-center gap-2 font-medium text-brand-700"><Check className="h-4 w-4" />Accepted</p>
            <AnchorProgress status={d.payout.status} amountOut={d.payout.amount_out} paidHash={d.payout.paidHash} />
            {d.payout.status === "incomplete" && (
              <a href={anchorUrl ?? d.payout.more_info_url} target="anchor" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium">Open the anchor window <External className="h-4 w-4" /></a>
            )}
          </div>
        )}
        {err && <p className="border-t bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      </div>
      <p className="text-center text-xs text-slate-500">Diaspora Bill Pay · Testnet demo. Funds are held by an escrow contract on Stellar and can only be released to this verified provider.</p>
    </div>
  );
}
