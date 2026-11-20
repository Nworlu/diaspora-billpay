"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useWallet } from "./WalletProvider";
import { ChevronLeft, Clock, Check, External, Copy } from "./icons";
import { getPayment, refund, type Payment } from "@/lib/escrow";
import { ESCROW_ID, EXPLORER } from "@/lib/config";
import { findProvider } from "@/lib/providers";
import { short, money, fmtDate, fmtDateTime } from "@/lib/format";

export function Receipt() {
  const { id } = useParams<{ id: string }>();
  const tx = useSearchParams().get("tx");
  const { address } = useWallet();
  const [p, setP] = useState<Payment | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refundTx, setRefundTx] = useState<string | null>(null);

  const load = () => getPayment(BigInt(id)).then(setP).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (err) return <p className="text-red-600">{err === "PaymentNotFound" ? `There's no payment #${id}.` : err}</p>;
  if (!p) return <p className="text-slate-500">Loading receipt…</p>;

  const prov = findProvider(p.provider);
  const kind = (prov?.category ?? "provider").toLowerCase();
  const tag = p.status.tag;
  const expired = Number(p.deadline) < Date.now() / 1000;
  const canRefund = tag === "Pending" && expired && address === p.sender;

  const doRefund = async () => {
    setBusy(true);
    try { const r = await refund(address!, BigInt(id)); setRefundTx(r.hash ?? null); await load(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const pill = tag === "Released" ? ["Released", "bg-brand-50 text-brand-700"]
    : tag === "Refunded" ? ["Refunded", "bg-slate-100 text-slate-700"]
    : expired ? ["Claim window closed", "bg-red-50 text-red-700"] : ["In escrow", "bg-amber-100 text-amber-900"];

  const steps = [
    { title: "Paid into escrow", sub: `${fmtDateTime(p.created_at)} · signed by ${short(p.sender)}`, state: "done" },
    tag === "Pending"
      ? { title: expired ? "Claim window closed" : `Waiting for the ${kind} to claim`, sub: expired ? "The sender can now refund" : `Claim window closes ${fmtDate(p.deadline)}`, state: "current" }
      : { title: tag === "Released" ? `Claimed by the ${kind}` : "Not claimed in time", sub: `Deadline was ${fmtDate(p.deadline)}`, state: "done" },
    tag === "Released" ? { title: `Released to the ${kind}'s wallet`, sub: short(p.provider), state: "done" }
      : tag === "Refunded" ? { title: "Refunded to the sender", sub: short(p.sender), state: "done" }
      : { title: `Released to the ${kind}'s wallet`, sub: "Or refunded to you if not claimed in time", state: "todo" },
  ];

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700"><ChevronLeft className="h-4 w-4" />Back to payments</Link>
      <div className="card overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <p className="font-mono text-xs text-slate-500">Receipt · Payment #{p.id.toString()}</p>
            <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${pill[1]}`}><Clock className="h-3.5 w-3.5" />{pill[0]}</span>
          </div>
          <p className="mt-3 font-display text-5xl font-semibold">{money(p.amount)} <span className="text-base font-normal text-slate-500">USDC</span></p>
          <p className="mt-2 text-slate-700">to <b>{prov?.name ?? short(p.provider)}</b>{prov ? `, ${prov.city}` : ""}.{" "}
            {tag === "Pending" ? `Held by the escrow contract until the ${kind} claims it.` : tag === "Released" ? `Released to the ${kind}'s verified wallet.` : "Returned to the sender."}</p>
        </div>

        <div className="border-t border-dashed p-6">
          <p className="mb-4 font-medium">Progress</p>
          <ol>
            {steps.map((s, i) => (
              <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
                {i < steps.length - 1 && <span className={`absolute left-[11px] top-6 h-full w-px ${s.state === "done" ? "bg-brand-600" : "bg-slate-200"}`} />}
                <span className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${s.state === "done" ? "border-brand-600 bg-brand-600 text-white" : s.state === "current" ? "border-amber-600 bg-amber-50" : "border-slate-300 bg-white"}`}>
                  {s.state === "done" ? <Check className="h-3.5 w-3.5" /> : s.state === "current" ? <span className="h-2 w-2 rounded-full bg-amber-600" /> : null}
                </span>
                <div><p className={`text-sm font-medium ${s.state === "todo" ? "text-slate-500" : ""}`}>{s.title}</p><p className="text-xs text-slate-500">{s.sub}</p></div>
              </li>
            ))}
          </ol>
        </div>

        <div className="border-t p-6">
          <p className="mb-4 font-medium">Details</p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            {[
              ["From", short(p.sender), true],
              ["To (verified wallet)", short(p.provider), true],
              ["Invoice reference", p.invoice_ref, false],
              ["Provider category", prov?.category ?? "—", false],
              ["Paid", fmtDateTime(p.created_at), false],
              ["Claim by", fmtDate(p.deadline), false],
              ["Escrow contract", short(ESCROW_ID), true],
              ["Transaction", tx ? short(tx) : refundTx ? short(refundTx) : "See contract history", !!(tx || refundTx)],
            ].map(([k, v, mono]) => (
              <div key={k as string}><dt className="text-xs text-slate-500">{k}</dt><dd className={mono ? "font-mono text-xs" : ""}>{v}</dd></div>
            ))}
          </dl>
        </div>

        <div className="flex flex-wrap gap-3 border-t bg-slate-50 p-6">
          <a href={tx ? `${EXPLORER}/tx/${tx}` : `${EXPLORER}/contract/${ESCROW_ID}`} target="_blank"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">View on Stellar Expert <External className="h-4 w-4" /></a>
          <button onClick={() => { navigator.clipboard.writeText(`${location.origin}/receipt/${p.id}`); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium"><Copy className="h-4 w-4" />{copied ? "Copied" : "Copy receipt link"}</button>
          {tag === "Pending" && (canRefund ? (
            <button onClick={doRefund} disabled={busy} className="w-full rounded-xl border border-red-300 bg-white py-2.5 text-sm font-medium text-red-700 sm:w-auto sm:px-4">{busy ? "Confirm in Freighter…" : "Refund to me"}</button>
          ) : (
            <span className="rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm text-slate-500">
              {expired ? "Only the sender can refund" : `Refund available after ${fmtDate(p.deadline).replace(/ \d{4}$/, "")}`}
            </span>
          ))}
        </div>
      </div>
      <p className="text-sm text-slate-600">This receipt is read straight from the escrow contract, so anyone with the payment ID can check it. Refund unlocks only if the {kind} hasn&apos;t claimed by the deadline.</p>
    </div>
  );
}
