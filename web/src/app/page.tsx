import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Pay school fees, hospital bills and rent in Nigeria, from anywhere.</h1>
        <p className="text-slate-600">
          Send USDC on Stellar. It sits in escrow and is released only to a verified provider&apos;s wallet,
          with an on-chain receipt. The provider cashes out to naira.
        </p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/send" className="rounded-2xl border bg-white p-5 shadow-sm hover:border-emerald-500">
          <p className="font-semibold">I&apos;m paying a bill</p>
          <p className="text-sm text-slate-600">Choose a verified provider and pay in USDC.</p>
        </Link>
        <Link href="/provider" className="rounded-2xl border bg-white p-5 shadow-sm hover:border-emerald-500">
          <p className="font-semibold">I&apos;m a provider</p>
          <p className="text-sm text-slate-600">See payments waiting for you and claim them.</p>
        </Link>
      </div>
      <ol className="space-y-2 text-sm text-slate-600">
        <li>1. The sender pays into a Soroban escrow contract with an invoice reference.</li>
        <li>2. Only the verified provider can claim it, before the deadline.</li>
        <li>3. If it isn&apos;t claimed in time, the sender gets a refund.</li>
      </ol>
    </div>
  );
}
