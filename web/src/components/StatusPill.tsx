import type { Payment } from "@/lib/escrow";
import { fmtShort } from "@/lib/format";

export function StatusPill({ p, view }: { p: Payment; view: "sender" | "provider" }) {
  const tag = p.status.tag;
  const expired = Number(p.deadline) < Date.now() / 1000;
  if (tag === "Released")
    return <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">Released to provider</span>;
  if (tag === "Refunded")
    return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{view === "sender" ? "Refunded to you" : "Refunded to sender"}</span>;
  if (expired)
    return <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">Claim window closed</span>;
  return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">In escrow · claim by {fmtShort(p.deadline)}</span>;
}
