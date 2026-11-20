"use client";
import { useCallback, useEffect, useState } from "react";
import { useWallet } from "./WalletProvider";
import { adminAddress, isVerified, registerProvider, removeProvider } from "@/lib/escrow";
import { allProviders, saveProvider } from "@/lib/providers";
import { short } from "@/lib/format";
import type { CategoryName, ProviderInfo } from "@/lib/config";

const CATS: CategoryName[] = ["School", "Hospital", "Landlord", "Other"];

export function AdminPanel() {
  const { address, connect } = useWallet();
  const [admin, setAdmin] = useState<string | null>(null);
  const [rows, setRows] = useState<(ProviderInfo & { verified: boolean })[] | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<CategoryName>("School");
  const [city, setCity] = useState("Lagos");
  const [wallet, setWallet] = useState("");
  const [walletKind, setWalletKind] = useState<"own" | "managed">("managed");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const list = allProviders();
    setRows(await Promise.all(list.map(async (p) => ({ ...p, verified: await isVerified(p.address).catch(() => false) }))));
  }, []);
  useEffect(() => { adminAddress().then(setAdmin).catch(() => {}); load(); }, [load]);

  const isAdmin = !!address && address === admin;
  const validAddr = /^G[A-Z2-7]{55}$/.test(wallet.trim());

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    if (!address) return connect();
    setBusy(key); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: ok }); await load(); }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(null); }
  };

  const add = () => {
    const base = { name: name.trim(), category, city: city.trim() || "Lagos" };
    run("add", async () => {
      let addr = wallet.trim();
      if (walletKind === "managed") {
        const r = await fetch("/api/managed-wallet", { method: "POST" }).then((r) => r.json());
        if (r.error) throw new Error(r.error);
        addr = r.address;
      }
      await registerProvider(address!, addr, base.name, base.category);
      saveProvider({ ...base, address: addr });
      setName(""); setWallet("");
    }, `${base.name} is verified.${walletKind === "managed" ? " Share claim links with them from each payment's receipt." : ""}`);
  };

  const verifiedN = rows?.filter((r) => r.verified).length ?? 0;
  const removedN = (rows?.length ?? 0) - verifiedN;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Verified providers</h1>
        <p className="max-w-xl text-slate-600">Senders can only pay wallets on this list, and escrow only releases to them. Changes need the admin key to sign in Freighter.</p>
        {address && admin && !isAdmin && (
          <p className="w-fit rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">The connected wallet isn&apos;t the admin (<span className="font-mono">{short(admin)}</span>), so changes will be rejected.</p>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <div className="card h-fit space-y-4 p-6">
          <h2 className="font-display text-xl font-semibold">Add a provider</h2>
          <label className="block space-y-1.5"><span className="text-sm font-medium">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grace Day Secondary School" className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-brand-600" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5"><span className="text-sm font-medium">Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value as CategoryName)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none focus:border-brand-600">
                {CATS.map((c) => <option key={c}>{c}</option>)}
              </select></label>
            <label className="block space-y-1.5"><span className="text-sm font-medium">City</span>
              <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-brand-600" /></label>
          </div>
          <div className="space-y-1.5">
            <span className="text-sm font-medium">How they get paid</span>
            <div className="grid gap-2">
              {([["managed", "Naira to their bank", "We hold a wallet for them. They accept by link, no crypto needed."], ["own", "Their own Stellar wallet", "They claim with Freighter and choose when to cash out."]] as const).map(([v, t, d]) => (
                <button key={v} type="button" onClick={() => setWalletKind(v)}
                  className={`rounded-xl border p-3 text-left ${walletKind === v ? "border-brand-600 bg-brand-50/60 ring-1 ring-brand-600" : "border-slate-200"}`}>
                  <p className="text-sm font-medium">{t}</p><p className="text-xs text-slate-600">{d}</p>
                </button>
              ))}
            </div>
          </div>
          {walletKind === "own" && (
            <label className="block space-y-1.5"><span className="text-sm font-medium">Stellar wallet address</span>
              <input value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="G…" className="w-full rounded-xl border border-slate-300 px-3 py-3 font-mono text-sm outline-none focus:border-brand-600" />
              <span className="block text-xs text-slate-500">Check this with the provider directly. Payments can only ever go to this address.</span></label>
          )}
          <button onClick={add} disabled={!!busy || !name.trim() || (walletKind === "own" && !validAddr)}
            className="w-full rounded-xl bg-brand-600 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-50">
            {busy === "add" ? "Confirm in Freighter…" : address ? "Verify and add" : "Connect Freighter"}
          </button>
          {msg && <p className={`rounded-lg p-2 text-sm ${msg.ok ? "bg-brand-50 text-brand-700" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
        </div>

        <div className="card p-6">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-xl font-semibold">On the list</h2>
            <span className="text-sm text-slate-500">{verifiedN} verified · {removedN} removed</span>
          </div>
          {rows === null ? <p className="text-sm text-slate-500">Loading…</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-xs text-slate-500">
                  <th className="py-2 font-normal">Provider</th><th className="font-normal">Wallet</th><th className="font-normal">Status</th><th />
                </tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.address} className="border-b last:border-0">
                      <td className="py-3"><p className={`font-semibold ${r.verified ? "" : "text-slate-500"}`}>{r.name}</p><p className="text-xs text-slate-500">{r.category} · {r.city}</p></td>
                      <td className="font-mono text-xs">{short(r.address)}</td>
                      <td>{r.verified
                        ? <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">Verified</span>
                        : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Removed</span>}</td>
                      <td className="text-right">
                        {r.verified ? (
                          <button onClick={() => run(r.address, () => removeProvider(address!, r.address), `${r.name} was removed.`)} disabled={!!busy}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">
                            {busy === r.address ? "Signing…" : "Remove"}</button>
                        ) : (
                          <button onClick={() => run(r.address, () => registerProvider(address!, r.address, r.name, r.category), `${r.name} is verified again.`)} disabled={!!busy}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50">
                            {busy === r.address ? "Signing…" : "Add back"}</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-sm text-slate-600">Removing a provider blocks new payments and claims. Money already in escrow for them goes back to senders after each deadline.</p>
        </div>
      </div>
    </div>
  );
}
