import { NextResponse } from "next/server";
import { checkLink, getManaged, keypairFor, modeOf, setManaged, type Mode } from "@/lib/server/managed";
import { paymentJson, readPayment, releaseAs } from "@/lib/server/chain";
import { advancePayout, startPayout } from "@/lib/server/payout";

type Ctx = { params: Promise<{ id: string }> };

async function load(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const p = await readPayment(BigInt(id));
  if (!checkLink(id, p.provider, new URL(req.url).searchParams.get("t"))) throw Object.assign(new Error("This claim link isn't valid."), { status: 403 });
  return { id, p };
}
const fail = (e: unknown) => NextResponse.json({ error: (e as Error).message }, { status: (e as { status?: number }).status ?? 400 });

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { id, p } = await load(req, ctx);
    const managed = !!getManaged(p.provider)?.secret;
    const payout = managed ? await advancePayout(p.provider, id).catch(() => null) : null;
    return NextResponse.json({ payment: paymentJson(p), managed, mode: modeOf(p.provider), payout });
  } catch (e) { return fail(e); }
}

/** Provider accepts: we claim from escrow with the wallet we hold, then (in naira mode) open the anchor cash-out. */
export async function POST(req: Request, ctx: Ctx) {
  try {
    const { id, p } = await load(req, ctx);
    const body = (await req.json().catch(() => ({}))) as { mode?: Mode };
    if (body.mode) setManaged(p.provider, { mode: body.mode });
    const kp = keypairFor(p.provider);
    let releaseHash: string | undefined;
    if (p.status.tag === "Pending") releaseHash = await releaseAs(kp, p.id);
    else if (p.status.tag !== "Released") throw new Error("This payment was refunded to the sender.");
    const out: Record<string, unknown> = { releaseHash, mode: modeOf(p.provider) };
    if (modeOf(p.provider) === "naira") out.payout = await startPayout(p.provider, id, p.amount);
    return NextResponse.json(out);
  } catch (e) { return fail(e); }
}
