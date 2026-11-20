import { Suspense } from "react";
import { PayBill } from "@/components/PayBill";
export default function Page() { return <Suspense fallback={<p className="text-slate-500">Loading…</p>}><PayBill /></Suspense>; }
