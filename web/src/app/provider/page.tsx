import { Suspense } from "react";
import { ProviderDashboard } from "@/components/ProviderDashboard";
export default function Page() { return <Suspense fallback={<p className="text-slate-500">Loading…</p>}><ProviderDashboard /></Suspense>; }
