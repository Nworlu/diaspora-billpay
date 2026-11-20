import "server-only";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";

/** Wallets the app holds for providers who don't want to touch crypto (testnet only, file-backed). */
export type Mode = "naira" | "hold";
export type Managed = { secret?: string; mode: Mode; anchorTx?: Record<string, { anchorId: string; paidHash?: string }> };
type Store = { linkSecret: string; providers: Record<string, Managed> };

const FILE = path.join(process.cwd(), ".data", "managed.json");

function read(): Store {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    const s: Store = { linkSecret: crypto.randomBytes(32).toString("hex"), providers: {} };
    write(s);
    return s;
  }
}
function write(s: Store) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(s, null, 2), { mode: 0o600 });
}

export const getManaged = (address: string): Managed | undefined => read().providers[address];
export const isManaged = (address: string) => !!getManaged(address)?.secret;
export const modeOf = (address: string): Mode => getManaged(address)?.mode ?? "hold";

export function setManaged(address: string, patch: Partial<Managed>) {
  const s = read();
  s.providers[address] = { ...{ mode: "hold" as Mode }, ...s.providers[address], ...patch };
  write(s);
}

export function keypairFor(address: string): Keypair {
  const m = getManaged(address);
  if (!m?.secret) throw new Error("This provider manages its own wallet");
  const kp = Keypair.fromSecret(m.secret);
  if (kp.publicKey() !== address) throw new Error("Managed key doesn't match provider");
  return kp;
}

export function linkToken(paymentId: string, provider: string) {
  return crypto.createHmac("sha256", read().linkSecret).update(`${paymentId}:${provider}`).digest("base64url").slice(0, 22);
}
export function checkLink(paymentId: string, provider: string, t: string | null) {
  if (!t) return false;
  const want = linkToken(paymentId, provider);
  return want.length === t.length && crypto.timingSafeEqual(Buffer.from(want), Buffer.from(t));
}
