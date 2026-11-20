export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org";
export const ESCROW_ID =
  process.env.NEXT_PUBLIC_ESCROW_ID ?? "CCG5LTK255NNA4ZQEFRBFMUZ52YGA3FERWJ7CNRWZINCFMKPGCMWRR2H";
export const USDC_ID =
  process.env.NEXT_PUBLIC_USDC_ID ?? "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
export const USDC_ASSET = "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
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

// Stellar test anchor (SEP-10 auth + SEP-24 withdraw). Cashes out Circle testnet USDC, 1–10 per withdrawal.
export const ANCHOR_HOME = "testanchor.stellar.org";
export const ANCHOR_AUTH = "https://testanchor.stellar.org/auth";
export const ANCHOR_SEP24 = "https://testanchor.stellar.org/sep24";
export const ANCHOR_MIN = 1;
export const ANCHOR_MAX = 10;
