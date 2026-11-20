import { DECIMALS } from "./config";
import { findProvider } from "./providers";

export const toUnits = (amount: string) => {
  const [whole, frac = ""] = amount.trim().split(".");
  return BigInt(whole || "0") * BigInt(10) ** BigInt(DECIMALS) + BigInt((frac + "0".repeat(DECIMALS)).slice(0, DECIMALS));
};

export const fromUnits = (units: bigint | number | string) => {
  const v = BigInt(units);
  const base = BigInt(10) ** BigInt(DECIMALS);
  const frac = (v % base).toString().padStart(DECIMALS, "0").replace(/0+$/, "");
  return `${v / base}${frac ? "." + frac : ""}`;
};

export const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

export const money = (units: bigint | number | string) => Number(fromUnits(units)).toFixed(2);
export const moneyStr = (dec: string | null) => (dec === null ? "—" : Number(dec).toFixed(2));

export const providerName = (a: string) => findProvider(a)?.name ?? short(a);

export const fmtDate = (secs: bigint | number) =>
  new Date(Number(secs) * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });

export const fmtDateTime = (secs: bigint | number) =>
  new Date(Number(secs) * 1000).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Lagos",
  }).replace(",", "") + " WAT";

export const fmtShort = (secs: bigint | number) =>
  new Date(Number(secs) * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" });
