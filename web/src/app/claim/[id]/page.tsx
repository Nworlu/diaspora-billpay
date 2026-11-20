import { Suspense } from "react";
import { ClaimLink } from "@/components/ClaimLink";
export default function Page() { return <Suspense fallback={<p className="text-slate-500">Loading…</p>}><ClaimLink /></Suspense>; }
