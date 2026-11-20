"use client";
import { PROVIDERS, type ProviderInfo } from "./config";

const KEY = "dbp.providers";

/** Display metadata for providers. Seeded list + ones added from the Admin page (kept in localStorage).
 *  Verification itself always comes from the contract (is_verified). */
export function allProviders(): ProviderInfo[] {
  if (typeof window === "undefined") return PROVIDERS;
  try {
    const extra = JSON.parse(localStorage.getItem(KEY) ?? "[]") as ProviderInfo[];
    const seen = new Set(PROVIDERS.map((p) => p.address));
    return [...PROVIDERS, ...extra.filter((p) => !seen.has(p.address))];
  } catch {
    return PROVIDERS;
  }
}

export function saveProvider(p: ProviderInfo) {
  const extra = JSON.parse(localStorage.getItem(KEY) ?? "[]") as ProviderInfo[];
  localStorage.setItem(KEY, JSON.stringify([...extra.filter((x) => x.address !== p.address), p]));
}

export const findProvider = (a: string) => allProviders().find((p) => p.address === a);
