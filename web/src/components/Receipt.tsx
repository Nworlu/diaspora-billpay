"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useWallet } from "@/components/WalletProvider";
import { getPayment, refund, type Payment } from "@/lib/escrow";
import { ESCROW_ID, EXPLORER } from "@/lib/config";
import { fromUnits, providerName, fmtDate } from "@/lib/format";

const badge: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Released: "bg-emerald-100 text-emerald-800",
  Refunded: "bg-slate-200 text-slate-700",
};

export function Receipt() {
  const { id } = useParams<{ id: string }>();
  const { address } = useWallet();
  const [p, setP] = useState<Payment | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => getPayment(BigInt(id)).then(setP).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const doRefund = async () => {
    setBusy(true);
    try {
      await refund(address!, BigInt(id));
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (err) return <p className="text-red-600">{err}</p>;
  if (!p) return <p className="text-slate-500">Loading receipt…</p>;

  const canRefund = p.status.tag === "Pending" && Number(p.deadline) < Date.now() / 1000 && address === p.sender;
  const rows: [string, string][] = [
    ["Amount", `${fromUnits(p.amount)} USDC`],
    ["Paid to", providerName(p.provider)],
    ["Invoice", p.invoice_ref],
    ["Paid on", fmtDate(p.created_at)],
    ["Claim deadline", fmtDate(p.deadline)],
    ["Sender", p.sender],
  ];

  return (
    <div className="space-y-4 rounded-2xl border bg-white p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Receipt #{p.id.toString()}</h1>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge[p.status.tag]}`}>{p.status.tag}</span>
      </div>
      <dl className="divide-y text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2">
            <dt className="text-slate-500">{k}</dt>
            <dd className="break-all text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <a href={`${EXPLORER}/contract/${ESCROW_ID}`} target="_blank" className="inline-block text-sm text-emerald-700 underline">
        Verify on Stellar Expert
      </a>
      {canRefund && (
        <button onClick={doRefund} disabled={busy} className="w-full rounded-lg border border-red-300 py-2 text-red-700">
          {busy ? "Refunding…" : "Refund to me"}
        </button>
      )}
    </div>
  );
}
