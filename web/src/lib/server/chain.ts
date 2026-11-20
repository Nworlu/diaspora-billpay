import "server-only";
import { Keypair, Networks, TransactionBuilder, Horizon, Operation, Asset } from "@stellar/stellar-sdk";
import { basicNodeSigner } from "@stellar/stellar-sdk/contract";
import { Client, type Payment } from "../escrow-client";
import { ESCROW_ID, HORIZON_URL, NETWORK_PASSPHRASE, RPC_URL, USDC_CODE, USDC_ISSUER } from "../config";

export const serverEscrow = (kp?: Keypair) =>
  new Client({
    contractId: ESCROW_ID,
    networkPassphrase: NETWORK_PASSPHRASE,
    rpcUrl: RPC_URL,
    publicKey: kp?.publicKey(),
    ...(kp ? { signTransaction: basicNodeSigner(kp, NETWORK_PASSPHRASE).signTransaction } : {}),
  });

export async function readPayment(id: bigint): Promise<Payment> {
  const r = (await serverEscrow().get_payment({ id })).result;
  if (!r.isOk()) throw new Error(r.unwrapErr().message);
  return r.unwrap();
}

export async function releaseAs(kp: Keypair, id: bigint): Promise<string | undefined> {
  const tx = await serverEscrow(kp).release({ id });
  if (!tx.result.isOk()) throw new Error(tx.result.unwrapErr().message);
  const sent = await tx.signAndSend();
  return sent.sendTransactionResponse?.hash;
}

export const signerFor = (kp: Keypair) => async (xdr: string) => {
  const tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
  tx.sign(kp);
  return tx.toXDR();
};

/** New wallet the app holds for a provider: funded with testnet XLM and a USDC trustline. */
export async function createManagedWallet(): Promise<Keypair> {
  const kp = Keypair.random();
  const f = await fetch(`https://friendbot.stellar.org?addr=${kp.publicKey()}`);
  if (!f.ok) throw new Error("Couldn't fund the new wallet on testnet");
  const horizon = new Horizon.Server(HORIZON_URL);
  const acc = await horizon.loadAccount(kp.publicKey());
  const tx = new TransactionBuilder(acc, { fee: "10000", networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.changeTrust({ asset: new Asset(USDC_CODE, USDC_ISSUER) }))
    .setTimeout(60)
    .build();
  tx.sign(kp);
  await horizon.submitTransaction(tx);
  return kp;
}

export const paymentJson = (p: Payment) => ({
  id: p.id.toString(),
  sender: p.sender,
  provider: p.provider,
  amount: p.amount.toString(),
  invoice_ref: p.invoice_ref,
  created_at: p.created_at.toString(),
  deadline: p.deadline.toString(),
  status: p.status.tag,
});
export type PaymentJson = ReturnType<typeof paymentJson>;
