import { ANCHOR_STATUS } from "@/lib/anchor-core";
import { EXPLORER } from "@/lib/config";

const ORDER = ["incomplete", "pending_user_transfer_start", "pending_user_transfer_complete", "pending_anchor", "pending_external", "completed"];

export function AnchorProgress({ status, amountOut, paidHash, dark }: { status: string; amountOut?: string; paidHash?: string; dark?: boolean }) {
  const idx = ORDER.indexOf(status);
  const steps = [
    { k: 0, t: "Bank details confirmed with the anchor" },
    { k: 1, t: "USDC sent to the anchor" },
    { k: 3, t: "Anchor converting to naira" },
    { k: 5, t: amountOut ? `Paid to bank (${amountOut})` : "Paid to the bank account" },
  ];
  const bad = ["error", "refunded", "expired"].includes(status);
  return (
    <div className={`space-y-2 text-sm ${dark ? "text-slate-200" : "text-slate-700"}`}>
      <p className={`font-medium ${bad ? "text-red-500" : ""}`}>{ANCHOR_STATUS[status] ?? status}</p>
      {!bad && (
        <ol className="space-y-1.5">
          {steps.map((s) => {
            const done = idx > s.k || status === "completed";
            const cur = !done && idx >= s.k - 1;
            return (
              <li key={s.k} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${done ? "bg-emerald-500" : cur ? "animate-pulse bg-amber-500" : dark ? "bg-white/20" : "bg-slate-200"}`} />
                <span className={done || cur ? "" : "opacity-60"}>{s.t}</span>
              </li>
            );
          })}
        </ol>
      )}
      {paidHash && <a href={`${EXPLORER}/tx/${paidHash}`} target="_blank" className="block text-xs underline opacity-80">USDC transfer to anchor</a>}
    </div>
  );
}
