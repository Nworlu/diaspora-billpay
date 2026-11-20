// Works in the browser (Freighter signs) and on the server (managed key signs).
import { Asset, Horizon, Memo, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { ANCHOR_AUTH, ANCHOR_HOME, ANCHOR_SEP24, HORIZON_URL, USDC_CODE, USDC_ISSUER } from "./config";

export type Signer = (xdr: string) => Promise<string>;
export type AnchorTx = {
  id: string;
  status: string;
  amount_in?: string;
  amount_out?: string;
  amount_fee?: string;
  withdraw_anchor_account?: string;
  withdraw_memo?: string;
  withdraw_memo_type?: "text" | "id" | "hash";
  stellar_transaction_id?: string;
  more_info_url?: string;
  message?: string;
};

/** SEP-10: get a challenge, have the account sign it, swap it for a JWT. */
export async function anchorAuth(account: string, sign: Signer): Promise<string> {
  const ch = await fetch(`${ANCHOR_AUTH}?account=${account}&home_domain=${ANCHOR_HOME}`).then((r) => r.json());
  if (!ch.transaction) throw new Error(ch.error ?? "Anchor didn't return a sign-in challenge");
  const signed = await sign(ch.transaction);
  const r = await fetch(ANCHOR_AUTH, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transaction: signed }) }).then((r) => r.json());
  if (!r.token) throw new Error(r.error ?? "Anchor sign-in failed");
  return r.token as string;
}

/** SEP-24: start an interactive withdrawal. Returns the anchor's window URL and transaction id. */
export async function startWithdraw(token: string, account: string, amount: string) {
  const r = await fetch(`${ANCHOR_SEP24}/transactions/withdraw/interactive`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ asset_code: USDC_CODE, asset_issuer: USDC_ISSUER, account, amount, lang: "en" }),
  }).then((r) => r.json());
  if (!r.url) throw new Error(r.error ?? "Anchor didn't start the withdrawal");
  return { url: r.url as string, id: r.id as string };
}

export async function getAnchorTx(token: string, id: string): Promise<AnchorTx> {
  const r = await fetch(`${ANCHOR_SEP24}/transaction?id=${id}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
  if (!r.transaction) throw new Error(r.error ?? "Anchor transaction not found");
  return r.transaction;
}

/** Once the anchor is ready (pending_user_transfer_start), send it the USDC with its memo. Returns the tx hash. */
export async function payAnchor(account: string, t: AnchorTx, sign: Signer): Promise<string> {
  if (!t.withdraw_anchor_account || !t.amount_in) throw new Error("Anchor hasn't given payment details yet");
  const horizon = new Horizon.Server(HORIZON_URL);
  const acc = await horizon.loadAccount(account);
  const memo =
    t.withdraw_memo_type === "hash" ? Memo.hash(Buffer.from(t.withdraw_memo!, "base64").toString("hex"))
    : t.withdraw_memo_type === "id" ? Memo.id(t.withdraw_memo!)
    : t.withdraw_memo ? Memo.text(t.withdraw_memo) : Memo.none();
  const tx = new TransactionBuilder(acc, { fee: "10000", networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.payment({ destination: t.withdraw_anchor_account, asset: new Asset(USDC_CODE, USDC_ISSUER), amount: t.amount_in }))
    .addMemo(memo)
    .setTimeout(120)
    .build();
  const signed = TransactionBuilder.fromXDR(await sign(tx.toXDR()), Networks.TESTNET);
  const res = await horizon.submitTransaction(signed);
  return res.hash;
}

export const ANCHOR_STATUS: Record<string, string> = {
  incomplete: "Waiting for your bank details in the anchor window",
  pending_user_transfer_start: "Sending USDC to the anchor",
  pending_user_transfer_complete: "Anchor received the USDC",
  pending_anchor: "Anchor is processing the payout",
  pending_external: "Bank transfer in progress",
  pending_stellar: "Anchor is processing the payout",
  completed: "Paid out to the bank account",
  error: "The anchor reported an error",
  refunded: "The anchor refunded the USDC",
  expired: "The withdrawal expired",
};
