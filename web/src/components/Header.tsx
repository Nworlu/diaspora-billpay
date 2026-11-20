"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "./WalletProvider";
import { short } from "@/lib/format";
import { Check } from "./icons";

const tabs = [
  { href: "/", label: "Pay a bill" },
  { href: "/provider", label: "Provider" },
  { href: "/admin", label: "Admin" },
];

export function Header() {
  const { address, connect, error } = useWallet();
  const path = usePathname();
  const active = (h: string) => (h === "/" ? path === "/" || path.startsWith("/receipt") : path.startsWith(h));
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-8 gap-y-3 px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white"><Check className="h-5 w-5" /></span>
          <span className="font-display text-[17px] font-semibold leading-tight">Diaspora Bill<br className="sm:hidden" /> Pay</span>
        </Link>
        <nav className="order-3 flex w-full gap-1 text-sm sm:order-none sm:w-auto">
          {tabs.map((t) => (
            <Link key={t.href} href={t.href}
              className={`rounded-lg px-3 py-2 ${active(t.href) ? "bg-brand-50 font-medium text-brand-700" : "text-slate-700 hover:bg-slate-50"}`}>
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 max-sm:contents">
          <span className="order-4 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 sm:order-none">Testnet</span>
          {address ? (
            <span className="order-5 flex items-center gap-2 rounded-lg sm:order-none border border-slate-200 px-3 py-2 font-mono text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />{short(address)}
            </span>
          ) : (
            <button onClick={connect} className="order-5 rounded-lg sm:order-none bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
              Connect Freighter
            </button>
          )}
        </div>
      </div>
      {error && <p className="mx-auto max-w-5xl px-5 pb-2 text-sm text-red-600">{error}</p>}
    </header>
  );
}
