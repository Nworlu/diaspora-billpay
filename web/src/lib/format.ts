import { DECIMALS, PROVIDERS } from "./config";

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

export const providerName = (a: string) => PROVIDERS.find((p) => p.address === a)?.name ?? short(a);

export const fmtDate = (secs: bigint | number) =>
  new Date(Number(secs) * 1000).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
