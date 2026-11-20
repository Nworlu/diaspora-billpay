"use client";
import {
  isConnected,
  requestAccess,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";
import { NETWORK_PASSPHRASE } from "./config";

export async function connectFreighter(): Promise<string> {
  const c = await isConnected();
  if (!c.isConnected) throw new Error("Freighter isn't installed. Get it at freighter.app, then switch it to Testnet.");
  const r = await requestAccess();
  if (r.error) throw new Error(String(r.error));
  return r.address;
}

export async function currentAddress(): Promise<string | null> {
  try {
    const c = await isConnected();
    if (!c.isConnected) return null;
    const r = await getAddress();
    return r.address || null;
  } catch {
    return null;
  }
}

export async function signWithFreighter(xdr: string, opts?: { networkPassphrase?: string; address?: string }) {
  const r = await signTransaction(xdr, {
    networkPassphrase: opts?.networkPassphrase ?? NETWORK_PASSPHRASE,
    address: opts?.address,
  });
  if (r.error) throw new Error(String(r.error));
  return { signedTxXdr: r.signedTxXdr, signerAddress: r.signerAddress };
}
