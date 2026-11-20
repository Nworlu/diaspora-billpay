import { NextResponse } from "next/server";
import { checkLink } from "@/lib/server/managed";
import { readPayment } from "@/lib/server/chain";
import { advancePayout } from "@/lib/server/payout";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const p = await readPayment(BigInt(id));
    if (!checkLink(id, p.provider, new URL(req.url).searchParams.get("t"))) return NextResponse.json({ error: "Invalid link" }, { status: 403 });
    return NextResponse.json({ payout: await advancePayout(p.provider, id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
