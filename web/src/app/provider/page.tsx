"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/components/WalletProvider";
import { listPayments, release, type Payment } from "@/lib/escrow";
import { fromUnits, providerName, short, fmtDate } from "@/lib/format";

export default function ProviderPage() {
  const { address, connect } = useWallet();
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) return;
    const all = await listPayments();
    setPayments(all.filter((p) => p.provider === address));
  }, [address]);

  useEffect(() => {
    load().catch((e) => setErr(e.message));
  }, [load]);

  const claim = async (id: bigint) => {
    setBusyId(id.toString());
    setErr(null);
    try {
      await release(address!, id);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  if (!address)
    return (
      <button onClick={connect} className="rounded-lg bg-emerald-600 px-4 py-2 text-white">Connect your provider wallet</button>
    );

  const now = Date.now() / 1000;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{providerName(address)}</h1>
        <p className="text-sm text-slate-500">Payments sent to this wallet</p>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {payments === null && <p className="text-slate-500">Loading…</p>}
      {payments?.length === 0 && <p className="text-slate-500">No payments for this wallet yet.</p>}
      <ul className="space-y-3">
        {payments?.map((p) => {
          const pending = p.status.tag === "Pending";
          const expired = Number(p.deadline) < now;
          return (
            <li key={p.id.toString()} className="flex items-center justify-between gap-3 rounded-2xl border bg-white p-4">
              <div>
                <p className="font-medium">{fromUnits(p.amount)} USDC · {p.invoice_ref}</p>
                <p className="text-xs text-slate-500">
                  #{p.id.toString()} from {short(p.sender)} · claim by {fmtDate(p.deadline)}
                </p>
              </div>
              {pending && !expired ? (
                <button onClick={() => claim(p.id)} disabled={busyId !== null} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">
                  {busyId === p.id.toString() ? "Claiming…" : "Claim"}
                </button>
              ) : (
                <Link href={`/receipt/${p.id}`} className="text-sm text-emerald-700 underline">
                  {pending ? "Expired" : p.status.tag}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
