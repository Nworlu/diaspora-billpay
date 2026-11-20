export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org";
export const ESCROW_ID =
  process.env.NEXT_PUBLIC_ESCROW_ID ?? "CAXZ2H6Y3T7IQPDLUL4E45DSEINXXKX2Y4JYBCC4EFZTN6B6ZHLR5PFK";
export const USDC_ID =
  process.env.NEXT_PUBLIC_USDC_ID ?? "CBX2TT5ZZ47HICZIJYHMW2N4PJEIDRXH3JUCAATYH4ZBG7W7MMNSGN3N";
export const USDC_ASSET = "USDC:GAMVKU4VDDSOAJF55D7IQXPXCMSYZVAG4SB4EPPLXC566VB4LTTB3FPC";
export const EXPLORER = "https://stellar.expert/explorer/testnet";
export const DECIMALS = 7;

export type CategoryName = "School" | "Hospital" | "Landlord" | "Other";
export type ProviderInfo = { address: string; name: string; category: CategoryName; city: string };
export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const USDC_CODE = "USDC";
export const USDC_ISSUER = USDC_ASSET.split(":")[1];

// Verified on-chain by the admin. The contract is the source of truth; this list is for display.
export const PROVIDERS: ProviderInfo[] = [
  { address: "GBOQ4IGR7ODUQ5CIAN3PRZ5S6ENRTRR3RDC4B5FOG3U3WJLLC3TZV4M4", name: "Lagos Grammar School", category: "School", city: "Lagos" },
  { address: "GCXY5OPKUTJIMMQPCGNP2RNXJ4IE5FRMNLCUNNLIKEQG276BTZYUJGXU", name: "Lagos Island General Hospital", category: "Hospital", city: "Lagos" },
  { address: "GBR4SP4Y7EWDJAU3JQHF34RLZUNBEMDYPOQKDV3CTVJU2NNQGPCGGGEX", name: "Adeyemi Properties, Yaba", category: "Landlord", city: "Lagos" },
];
