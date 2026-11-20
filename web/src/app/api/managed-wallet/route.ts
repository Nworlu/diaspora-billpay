import { NextResponse } from "next/server";
import { createManagedWallet } from "@/lib/server/chain";
import { setManaged } from "@/lib/server/managed";

/** Admin: create a wallet the app holds for a provider that wants naira only. The admin then verifies it on-chain. */
export async function POST() {
  try {
    const kp = await createManagedWallet();
    setManaged(kp.publicKey(), { secret: kp.secret(), mode: "naira" });
    return NextResponse.json({ address: kp.publicKey() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
