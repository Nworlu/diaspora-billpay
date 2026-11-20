"use client";
import Link from "next/link";
import { useWallet } from "./WalletProvider";
import { short } from "@/lib/format";

export function Header() {
  const { address, connect, error } = useWallet();
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-semibold text-emerald-700">BillBridge</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/send" className="hover:text-emerald-700">Pay a bill</Link>
          <Link href="/provider" className="hover:text-emerald-700">Providers</Link>
          {address ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-mono text-xs text-emerald-800">{short(address)}</span>
          ) : (
            <button onClick={connect} className="rounded-full bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-700">
              Connect Freighter
            </button>
          )}
        </nav>
      </div>
      {error && <p className="mx-auto max-w-3xl px-4 pb-2 text-sm text-red-600">{error}</p>}
    </header>
  );
}
