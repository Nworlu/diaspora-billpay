"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "./WalletProvider";
import { CategoryIcon, Shield, Check } from "./icons";
import { StatusPill } from "./StatusPill";
import { allProviders } from "@/lib/providers";
import { isVerified, listPayments, pay, type Payment } from "@/lib/escrow";
import { usdcBalance } from "@/lib/balance";
import { toUnits, short, fmtDate, providerName, money, moneyStr } from "@/lib/format";
import type { ProviderInfo } from "@/lib/config";

const WINDOWS = [7, 14, 30];

export function PayBill() {
  const { address, connect } = useWallet();
  const router = useRouter();
  const [providers, setProviders] = useState<(ProviderInfo & { verified: boolean })[]>([]);
  const [provider, setProvider] = useState<string>("");
  const [amount, setAmount] = useState("50");
  const [invoice, setInvoice] = useState("INV-0042 · Term 1 fees");
  const [days, setDays] = useState(14);
  const [balance, setBalance] = useState<string | null>(null);
  const [mine, setMine] = useState<Payment[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const list = allProviders();
    Promise.all(list.map(async (p) => ({ ...p, verified: await isVerified(p.address).catch(() => false) }))).then((ps) => {
      const v = ps.filter((p) => p.verified);
      setProviders(v);
      setProvider((cur) => cur || v[0]?.address || "");
    });
  }, []);

  const loadMine = useCallback(async () => {
    if (!address) return;
    usdcBalance(address).then(setBalance);
    const all = await listPayments();
    setMine(all.filter((p) => p.sender === address));
  }, [address]);
  useEffect(() => { loadMine().catch(() => setMine([])); }, [loadMine]);

  // Deadline: end of day N days from now; the contract allows 3–30 days, so stay just inside 30.
  const deadline = useMemo(() => {
    const secs = Math.floor(Date.now() / 1000) + days * 86400 - (days === 30 ? 600 : 0);
    return BigInt(secs);
  }, [days]);
  const sel = providers.find((p) => p.address === provider);
  const amountOk = Number(amount) > 0;

  const submit = async () => {
    if (!address) return connect();
    if (!sel || !amountOk) return;
    setBusy(true); setErr(null);
    try {
      const { id, hash } = await pay({ sender: address, provider, amount: toUnits(amount), invoiceRef: invoice, deadline });
      router.push(`/receipt/${id}${hash ? `?tx=${hash}` : ""}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Pay a bill in Nigeria</h1>
        <p className="max-w-xl text-slate-600">Send USDC to a verified school, hospital or landlord. The money waits in escrow and can only be released to that provider&apos;s wallet.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_250px]">
        <div className="card space-y-7 p-6">
          <section className="space-y-3">
            <h2 className="font-medium"><span className="mr-2 font-mono text-xs text-slate-500">01</span>Who are you paying?</h2>
            {providers.length === 0 && <p className="text-sm text-slate-500">Loading verified providers…</p>}
            <div className="grid gap-3 sm:grid-cols-3">
              {providers.map((p) => {
                const on = p.address === provider;
                return (
                  <button key={p.address} onClick={() => setProvider(p.address)}
                    className={`relative rounded-xl border p-3.5 text-left transition ${on ? "border-brand-600 bg-brand-50/60 ring-1 ring-brand-600" : "border-slate-200 hover:border-slate-300"}`}>
                    {on && <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white"><Check className="h-3.5 w-3.5" /></span>}
                    <span className="mb-3 grid h-8 w-8 place-items-center rounded-lg bg-slate-100"><CategoryIcon category={p.category} className="h-4 w-4" /></span>
                    <p className="font-medium leading-snug">{p.name}</p>
                    <p className="text-sm text-slate-500">{p.category} · {p.city}</p>
                    <p className="mt-2 flex items-center gap-1 text-xs text-brand-700"><Shield className="h-3.5 w-3.5" />Verified <span className="font-mono text-slate-500">{short(p.address)}</span></p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-medium"><span className="mr-2 font-mono text-xs text-slate-500">02</span>How much, and for what?</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Amount</span>
                <div className="flex items-center rounded-xl border border-slate-300 px-3 focus-within:border-brand-600">
                  <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className="w-full py-2.5 text-xl outline-none" />
                  <span className="text-sm text-slate-500">USDC</span>
                </div>
                <span className="block text-xs text-slate-500">Balance: {address ? `${moneyStr(balance)} USDC` : "connect wallet"}</span>
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Invoice or reference</span>
                <input value={invoice} onChange={(e) => setInvoice(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-brand-600" />
                <span className="block text-xs text-slate-500">Shown to the provider and stored on the receipt.</span>
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-medium"><span className="mr-2 font-mono text-xs text-slate-500">03</span>How long can they take to claim it?</h2>
            <div className="flex gap-2">
              {WINDOWS.map((d) => (
                <button key={d} onClick={() => setDays(d)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium ${d === days ? "border-ink bg-ink text-white" : "border-slate-300 hover:border-slate-400"}`}>{d} days</button>
              ))}
            </div>
            <p className="text-sm text-slate-600">If the provider hasn&apos;t claimed by <b>{fmtDate(deadline)}</b>, you can take the money back. The contract allows 3 to 30 days.</p>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl bg-ink p-5 text-white">
            <p className="text-sm text-slate-300">You&apos;re paying</p>
            <p className="mt-1 font-display text-4xl font-semibold">{amountOk ? Number(amount).toFixed(2) : "0.00"} <span className="text-sm font-normal text-slate-300">USDC</span></p>
            <dl className="mt-4 space-y-2 text-sm">
              {[
                ["To", sel?.name ?? "—"],
                ["Wallet", sel ? short(sel.address) : "—"],
                ["Claim by", fmtDate(deadline)],
                ["Network fee", "Shown in Freighter"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2"><dt className="text-slate-400">{k}</dt><dd className={`text-right font-medium ${k === "Wallet" ? "font-mono text-xs" : ""}`}>{v}</dd></div>
              ))}
            </dl>
            <button onClick={submit} disabled={busy || (!!address && (!sel || !amountOk))}
              className="mt-5 w-full rounded-xl bg-brand-600 py-3 font-medium hover:bg-brand-700 disabled:opacity-50">
              {!address ? "Connect Freighter" : busy ? "Confirm in Freighter…" : `Pay ${amountOk ? Number(amount).toFixed(2) : ""} USDC`}
            </button>
            <p className="mt-3 text-center text-xs text-slate-400">You&apos;ll confirm in Freighter. Nothing moves until you sign.</p>
            {err && <p className="mt-3 rounded-lg bg-red-500/15 p-2 text-xs text-red-200">{err}</p>}
          </div>
          <div className="card p-5">
            <p className="mb-3 text-sm font-medium">What happens next</p>
            <ol className="space-y-3 text-sm text-slate-600">
              {[
                "Your USDC moves into the escrow contract and you get an on-chain receipt.",
                `Only ${sel?.name ?? "the provider"}'s verified wallet can claim it.`,
                `Not claimed by ${fmtDate(deadline)}? Refund it to yourself.`,
              ].map((t, i) => (
                <li key={i} className="flex gap-3"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-50 text-xs text-brand-700">{i + 1}</span>{t}</li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      <div className="card p-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-semibold">Your payments</h2>
          <span className="text-sm text-slate-500">From this wallet</span>
        </div>
        {!address ? <p className="text-sm text-slate-500">Connect Freighter to see your payments.</p>
          : mine === null ? <p className="text-sm text-slate-500">Loading…</p>
          : mine.length === 0 ? <p className="text-sm text-slate-500">No payments from this wallet yet.</p>
          : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs text-slate-500">
                <th className="py-2 font-normal">ID</th><th className="font-normal">Provider</th><th className="font-normal">Reference</th>
                <th className="text-right font-normal">Amount</th><th className="pl-4 font-normal">Status</th><th />
              </tr></thead>
              <tbody>
                {mine.map((p) => (
                  <tr key={p.id.toString()} className="border-b last:border-0">
                    <td className="py-3 text-slate-500">#{p.id.toString()}</td>
                    <td className="font-medium">{providerName(p.provider)}</td>
                    <td className="text-slate-600">{p.invoice_ref}</td>
                    <td className="text-right font-semibold">{money(p.amount)}</td>
                    <td className="pl-4"><StatusPill p={p} view="sender" /></td>
                    <td className="text-right"><Link href={`/receipt/${p.id}`} className="font-medium text-brand-700 underline">Receipt</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
