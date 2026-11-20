"use client";
import { useState } from "react";
import Link from "next/link";
import { useWallet } from "@/components/WalletProvider";
import { PROVIDERS, EXPLORER } from "@/lib/config";
import { pay } from "@/lib/escrow";
import { toUnits } from "@/lib/format";

export default function SendPage() {
  const { address, connect } = useWallet();
  const [provider, setProvider] = useState(PROVIDERS[0].address);
  const [amount, setAmount] = useState("50");
  const [invoice, setInvoice] = useState("SCH-2026-T1-002");
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: bigint; hash?: string } | null>(null);

  const submit = async () => {
    if (!address) return connect();
    setBusy(true);
    setErr(null);
    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + days * 86400);
      setDone(await pay({ sender: address, provider, amount: toUnits(amount), invoiceRef: invoice, deadline }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <div className="space-y-4 rounded-2xl border bg-white p-6">
        <h1 className="text-xl font-semibold">Payment #{done.id.toString()} is in escrow</h1>
        <p className="text-slate-600">Only the provider you picked can claim it.</p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/receipt/${done.id}`} className="rounded-lg bg-emerald-600 px-4 py-2 text-white">View receipt</Link>
          {done.hash && (
            <a href={`${EXPLORER}/tx/${done.hash}`} target="_blank" className="rounded-lg border px-4 py-2">See on Stellar Expert</a>
          )}
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Pay a bill</h1>
      <div className="space-y-4 rounded-2xl border bg-white p-6">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Verified provider</span>
          <select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full rounded-lg border p-2">
            {PROVIDERS.map((p) => (
              <option key={p.address} value={p.address}>{p.name} ({p.category})</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Amount (USDC)</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="w-full rounded-lg border p-2" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Invoice reference</span>
          <input value={invoice} onChange={(e) => setInvoice(e.target.value)} className="w-full rounded-lg border p-2" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Provider has {days} days to claim (3 to 30)</span>
          <input type="range" min={3} max={29} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full" />
        </label>
        <button onClick={submit} disabled={busy} className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white disabled:opacity-50">
          {!address ? "Connect Freighter" : busy ? "Waiting for signature…" : `Pay ${amount} USDC`}
        </button>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    </div>
  );
}
