import { Client, type Payment } from "./escrow-client";
import { ESCROW_ID, NETWORK_PASSPHRASE, RPC_URL } from "./config";
import { signWithFreighter } from "./wallet";

export type { Payment };

export const escrow = (publicKey?: string) =>
  new Client({
    contractId: ESCROW_ID,
    networkPassphrase: NETWORK_PASSPHRASE,
    rpcUrl: RPC_URL,
    publicKey,
    signTransaction: signWithFreighter,
  });

const unwrap = <T,>(r: { isOk(): boolean; unwrap(): T; unwrapErr(): { message: string } }) => {
  if (!r.isOk()) throw new Error(r.unwrapErr().message);
  return r.unwrap();
};

export async function getPayment(id: bigint): Promise<Payment> {
  const tx = await escrow().get_payment({ id });
  return unwrap(tx.result);
}

export async function paymentCount(): Promise<number> {
  const tx = await escrow().payment_count();
  return Number(tx.result);
}

export async function listPayments(): Promise<Payment[]> {
  const n = await paymentCount();
  const ids = Array.from({ length: n }, (_, i) => BigInt(i + 1));
  const res = await Promise.allSettled(ids.map(getPayment));
  return res.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])).reverse();
}

export async function pay(args: {
  sender: string;
  provider: string;
  amount: bigint;
  invoiceRef: string;
  deadline: bigint;
}) {
  const tx = await escrow(args.sender).pay({
    sender: args.sender,
    provider: args.provider,
    amount: args.amount,
    invoice_ref: args.invoiceRef,
    deadline: args.deadline,
  });
  unwrap(tx.result); // surface contract errors before asking for a signature
  const sent = await tx.signAndSend();
  return { id: unwrap(sent.result), hash: sent.sendTransactionResponse?.hash };
}

export async function release(provider: string, id: bigint) {
  const tx = await escrow(provider).release({ id });
  unwrap(tx.result);
  const sent = await tx.signAndSend();
  return { hash: sent.sendTransactionResponse?.hash };
}

export async function refund(sender: string, id: bigint) {
  const tx = await escrow(sender).refund({ id });
  unwrap(tx.result);
  const sent = await tx.signAndSend();
  return { hash: sent.sendTransactionResponse?.hash };
}
