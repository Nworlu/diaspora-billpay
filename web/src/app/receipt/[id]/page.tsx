import { Suspense } from "react";
import { Receipt } from "@/components/Receipt";

export default function ReceiptPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading receipt…</p>}>
      <Receipt />
    </Suspense>
  );
}
