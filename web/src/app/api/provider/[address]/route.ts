import { NextResponse } from "next/server";
import { getManaged, setManaged, type Mode } from "@/lib/server/managed";

type Ctx = { params: Promise<{ address: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const { address } = await ctx.params;
  const m = getManaged(address);
  return NextResponse.json({ managed: !!m?.secret, mode: m?.mode ?? "hold" });
}

// Testnet demo: no sign-in on this setting yet. In production the provider would sign a SEP-10 challenge first.
export async function POST(req: Request, ctx: Ctx) {
  const { address } = await ctx.params;
  const { mode } = (await req.json()) as { mode: Mode };
  if (mode !== "naira" && mode !== "hold") return NextResponse.json({ error: "Bad mode" }, { status: 400 });
  setManaged(address, { mode });
  return NextResponse.json({ ok: true, mode });
}
