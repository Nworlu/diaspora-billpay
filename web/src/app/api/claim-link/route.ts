import { NextResponse } from "next/server";
import { linkToken } from "@/lib/server/managed";
import { readPayment } from "@/lib/server/chain";

export async function POST(req: Request) {
  const { id } = await req.json();
  try {
    const p = await readPayment(BigInt(id));
    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    return NextResponse.json({ url: `${origin}/claim/${id}?t=${linkToken(String(id), p.provider)}` });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
