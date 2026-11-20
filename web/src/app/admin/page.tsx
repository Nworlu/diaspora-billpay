import { Suspense } from "react";
import { AdminPanel } from "@/components/AdminPanel";
export default function Page() { return <Suspense fallback={<p className="text-slate-500">Loading…</p>}><AdminPanel /></Suspense>; }
