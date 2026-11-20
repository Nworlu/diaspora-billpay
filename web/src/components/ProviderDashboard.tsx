"use client";
import { useCallback, useEffect, useState } from "react";
import { useWallet } from "./WalletProvider";
import { CategoryIcon, Shield, Clock, Check, External } from "./icons";
import { isVerified, listPayments, release, type Payment } from "@/lib/escrow";
import { usdcBalance } from "@/lib/balance";
import { findProvider } from "@/lib/providers";
import { money, moneyStr, short, fmtDate, fmtShort } from "@/lib/format";

export function ProviderDashboard() {
  const { address, connect } = useWallet();
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [cashOut, setCashOut] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) return;
    isVerified(address).then(setVerified).catch(() => setVerified(false));
    usdcBalance(address).then((b) => { setBalance(b); setCashOut((c) => c || Number(b ?? 0).toFixed(2)); });
    const all = await listPayments();
    setPayments(all.filter((p) => p.provider === address));
  }, [address]);
  useEffect(() => { load().catch((e) => setErr(e.message)); }, [load]);

  if (!address)
    return (
      <div className="card mx-auto max-w-md space-y-4 p-8 text-center">
        <h1 className="font-display text-2xl font-semibold">Provider dashboard</h1>
        <p className="text-slate-600">Connect the wallet your school, hospital or property is verified with to see and claim payments.</p>
        <button onClick={connect} className="rounded-xl bg-brand-600 px-5 py-3 font-medium text-white">Connect Freighter</button>
      </div>
    );

  const info = findProvider(address);
  const now = Date.now() / 1000;
  const claimable = (payments ?? []).filter((p) => p.status.tag === "Pending" && Number(p.deadline) >= now);
  const waiting = claimable.reduce((s, p) => s + p.amount, BigInt(0));
  const order = (p: Payment) => (p.status.tag === "Pending" ? (Number(p.deadline) >= now ? 0 : 1) : 2);
  const sorted = [...(payments ?? [])].sort((a, b) => order(a) - order(b) || Number(b.id - a.id));

  const claim = async (p: Payment) => {
    setBusy(p.id.toString()); setErr(null);
    try { await release(address, p.id); await load(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-xl border border-slate-200 bg-white"><CategoryIcon category={info?.category ?? "School"} className="h-6 w-6" /></span>
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{info?.name ?? short(address)}</h1>
          {verified === false ? <p className="text-sm text-red-700">This wallet isn&apos;t on the verified list, so it can&apos;t receive payments.</p>
            : <p className="flex items-center gap-1 text-sm text-slate-600"><Shield className="h-4 w-4 text-brand-700" /><span className="font-medium text-brand-700">Verified {(info?.category ?? "provider").toLowerCase()}</span>{info ? ` · ${info.city}` : ""}</p>}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card p-5">
              <p className="text-sm text-slate-600">Waiting for you to claim</p>
              <p className="mt-1 font-display text-4xl font-semibold">{money(waiting)} <span className="text-sm font-normal text-slate-500">USDC</span></p>
              <p className="mt-1 text-sm font-medium text-amber-800">{claimable.length} payment{claimable.length === 1 ? "" : "s"}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-slate-600">In your wallet</p>
              <p className="mt-1 font-display text-4xl font-semibold">{moneyStr(balance)} <span className="text-sm font-normal text-slate-500">USDC</span></p>
              <p className="mt-1 text-sm text-slate-600">Ready to cash out to naira</p>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-display text-2xl font-semibold">Payments to you</h2>
            <p className="mb-4 text-sm text-slate-600">Claim before the deadline or the sender can refund</p>
            {err && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</p>}
            {payments === null ? <p className="text-sm text-slate-500">Loading…</p>
              : sorted.length === 0 ? <p className="text-sm text-slate-500">No payments to this wallet yet.</p>
              : (
              <ul className="space-y-3">
                {sorted.map((p) => {
                  const tag = p.status.tag;
                  const open = tag === "Pending" && Number(p.deadline) >= now;
                  return (
                    <li key={p.id.toString()} className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${open ? "border-slate-200" : "border-slate-200 bg-slate-50"}`}>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-lg font-semibold">{money(p.amount)} USDC <span className="ml-1 font-mono text-xs font-normal text-slate-500">#{p.id.toString()}</span></p>
                        <p className="text-sm text-slate-700">{p.invoice_ref}</p>
                        <p className="text-xs text-slate-500">From <span className="font-mono">{short(p.sender)}</span></p>
                      </div>
                      {open ? (
                        <div className="flex flex-col gap-2 sm:items-end">
                          <span className="flex items-center gap-1 text-sm font-medium text-amber-800"><Clock className="h-4 w-4" />Claim by {fmtDate(p.deadline)}</span>
                          <button onClick={() => claim(p)} disabled={!!busy || verified === false}
                            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                            {busy === p.id.toString() ? "Confirm in Freighter…" : `Claim ${money(p.amount)} USDC`}
                          </button>
                        </div>
                      ) : tag === "Released" ? (
                        <span className="flex w-fit items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"><Check className="h-3.5 w-3.5" />Released</span>
                      ) : tag === "Refunded" ? (
                        <span className="w-fit rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">Refunded to sender</span>
                      ) : (
                        <span className="w-fit rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">Missed · closed {fmtShort(p.deadline)}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-2xl bg-ink p-6 text-white">
          <h2 className="font-display text-2xl font-semibold">Cash out to naira</h2>
          <p className="mt-1 text-sm text-slate-300">Withdraw USDC to a Nigerian bank account through a Stellar anchor.</p>
          <label className="mt-5 block space-y-1.5">
            <span className="text-sm font-medium">Amount</span>
            <div className="flex items-center rounded-xl border border-white/15 bg-white/5 px-3">
              <input value={cashOut} onChange={(e) => setCashOut(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className="w-full bg-transparent py-3 text-xl outline-none" />
              <span className="text-sm text-slate-400">USDC</span>
            </div>
            <span className="block text-xs text-slate-400">Available: {moneyStr(balance)} USDC</span>
          </label>
          <dl className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
            {[["Anchor", "Stellar test anchor"], ["Rate and fees", "Set by the anchor"], ["Paid to", "Bank account you add next"]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2"><dt className="text-slate-400">{k}</dt><dd className="text-right">{v}</dd></div>
            ))}
          </dl>
          <button disabled title="Coming next: SEP-24 withdraw with the Stellar test anchor"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-medium text-ink disabled:opacity-70">
            Continue with anchor <External className="h-4 w-4" />
          </button>
          <p className="mt-3 text-xs text-slate-400">Opens the anchor&apos;s window. You sign in with your wallet, then the anchor handles the bank payout and its own checks.</p>
        </aside>
      </div>
    </div>
  );
}
