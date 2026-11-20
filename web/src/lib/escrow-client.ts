import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CAXZ2H6Y3T7IQPDLUL4E45DSEINXXKX2Y4JYBCC4EFZTN6B6ZHLR5PFK",
  }
} as const


export const Errors = {
  1: {message:"ProviderNotVerified"},
  2: {message:"InvalidAmount"},
  3: {message:"InvalidDeadline"},
  4: {message:"PaymentNotFound"},
  5: {message:"NotPending"},
  6: {message:"DeadlineNotReached"},
  7: {message:"DeadlinePassed"},
  8: {message:"ProviderNotFound"}
}

export type Status = {tag: "Pending", values: void} | {tag: "Released", values: void} | {tag: "Refunded", values: void};


export interface Payment {
  amount: i128;
  created_at: u64;
  deadline: u64;
  id: u64;
  invoice_ref: string;
  provider: string;
  sender: string;
  status: Status;
}

export type Category = {tag: "School", values: void} | {tag: "Hospital", values: void} | {tag: "Landlord", values: void} | {tag: "Other", values: void};


export interface Provider {
  active: boolean;
  category: Category;
  name: string;
}





export interface Client {
  /**
   * Construct and simulate a pay transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Sender deposits `amount` into escrow for a verified provider. Returns the payment id.
   * `deadline` must be between 3 and 30 days from now.
   */
  pay: ({sender, provider, amount, invoice_ref, deadline}: {sender: string, provider: string, amount: i128, invoice_ref: string, deadline: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<u64>>>

  /**
   * Construct and simulate a refund transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Sender gets the money back if the provider did not claim before the deadline.
   */
  refund: ({id}: {id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a release transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Provider claims a pending payment on or before the deadline. Funds go only to the provider.
   */
  release: ({id}: {id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_payment transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_payment: ({id}: {id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Payment>>>

  /**
   * Construct and simulate a is_verified transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  is_verified: ({provider}: {provider: string}, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a get_provider transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_provider: ({provider}: {provider: string}, options?: MethodOptions) => Promise<AssembledTransaction<Option<Provider>>>

  /**
   * Construct and simulate a admin_address transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  admin_address: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a payment_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  payment_count: (options?: MethodOptions) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a token_address transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  token_address: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a remove_provider transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  remove_provider: ({provider}: {provider: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a register_provider transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  register_provider: ({provider, name, category}: {provider: string, name: string, category: Category}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin, token}: {admin: string, token: string},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({admin, token}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABQAAAAAAAAAAAAAABFBhaWQAAAABAAAABHBhaWQAAAAGAAAAAAAAAAJpZAAAAAAABgAAAAEAAAAAAAAABnNlbmRlcgAAAAAAEwAAAAEAAAAAAAAACHByb3ZpZGVyAAAAEwAAAAEAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAAAAAAC2ludm9pY2VfcmVmAAAAABAAAAAAAAAAAAAAAAhkZWFkbGluZQAAAAYAAAAAAAAAAg==",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAACAAAAAAAAAATUHJvdmlkZXJOb3RWZXJpZmllZAAAAAABAAAAAAAAAA1JbnZhbGlkQW1vdW50AAAAAAAAAgAAAAAAAAAPSW52YWxpZERlYWRsaW5lAAAAAAMAAAAAAAAAD1BheW1lbnROb3RGb3VuZAAAAAAEAAAAAAAAAApOb3RQZW5kaW5nAAAAAAAFAAAAAAAAABJEZWFkbGluZU5vdFJlYWNoZWQAAAAAAAYAAAAAAAAADkRlYWRsaW5lUGFzc2VkAAAAAAAHAAAAAAAAABBQcm92aWRlck5vdEZvdW5kAAAACA==",
        "AAAAAgAAAAAAAAAAAAAABlN0YXR1cwAAAAAAAwAAAAAAAAAAAAAAB1BlbmRpbmcAAAAAAAAAAAAAAAAIUmVsZWFzZWQAAAAAAAAAAAAAAAhSZWZ1bmRlZA==",
        "AAAAAQAAAAAAAAAAAAAAB1BheW1lbnQAAAAACAAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAApjcmVhdGVkX2F0AAAAAAAGAAAAAAAAAAhkZWFkbGluZQAAAAYAAAAAAAAAAmlkAAAAAAAGAAAAAAAAAAtpbnZvaWNlX3JlZgAAAAAQAAAAAAAAAAhwcm92aWRlcgAAABMAAAAAAAAABnNlbmRlcgAAAAAAEwAAAAAAAAAGc3RhdHVzAAAAAAfQAAAABlN0YXR1cwAA",
        "AAAAAgAAAAAAAAAAAAAACENhdGVnb3J5AAAABAAAAAAAAAAAAAAABlNjaG9vbAAAAAAAAAAAAAAAAAAISG9zcGl0YWwAAAAAAAAAAAAAAAhMYW5kbG9yZAAAAAAAAAAAAAAABU90aGVyAAAA",
        "AAAAAQAAAAAAAAAAAAAACFByb3ZpZGVyAAAAAwAAAAAAAAAGYWN0aXZlAAAAAAABAAAAAAAAAAhjYXRlZ29yeQAAB9AAAAAIQ2F0ZWdvcnkAAAAAAAAABG5hbWUAAAAQ",
        "AAAABQAAAAAAAAAAAAAACFJlZnVuZGVkAAAAAQAAAAhyZWZ1bmRlZAAAAAMAAAAAAAAAAmlkAAAAAAAGAAAAAQAAAAAAAAAGc2VuZGVyAAAAAAATAAAAAQAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAACFJlbGVhc2VkAAAAAQAAAAhyZWxlYXNlZAAAAAMAAAAAAAAAAmlkAAAAAAAGAAAAAQAAAAAAAAAIcHJvdmlkZXIAAAATAAAAAQAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAADVByb3ZpZGVyQWRkZWQAAAAAAAABAAAADnByb3ZpZGVyX2FkZGVkAAAAAAADAAAAAAAAAAhwcm92aWRlcgAAABMAAAABAAAAAAAAAARuYW1lAAAAEAAAAAAAAAAAAAAACGNhdGVnb3J5AAAH0AAAAAhDYXRlZ29yeQAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAAD1Byb3ZpZGVyUmVtb3ZlZAAAAAABAAAAEHByb3ZpZGVyX3JlbW92ZWQAAAABAAAAAAAAAAhwcm92aWRlcgAAABMAAAABAAAAAg==",
        "AAAAAAAAAIhTZW5kZXIgZGVwb3NpdHMgYGFtb3VudGAgaW50byBlc2Nyb3cgZm9yIGEgdmVyaWZpZWQgcHJvdmlkZXIuIFJldHVybnMgdGhlIHBheW1lbnQgaWQuCmBkZWFkbGluZWAgbXVzdCBiZSBiZXR3ZWVuIDMgYW5kIDMwIGRheXMgZnJvbSBub3cuAAAAA3BheQAAAAAFAAAAAAAAAAZzZW5kZXIAAAAAABMAAAAAAAAACHByb3ZpZGVyAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAtpbnZvaWNlX3JlZgAAAAAQAAAAAAAAAAhkZWFkbGluZQAAAAYAAAABAAAD6QAAAAYAAAAD",
        "AAAAAAAAAE1TZW5kZXIgZ2V0cyB0aGUgbW9uZXkgYmFjayBpZiB0aGUgcHJvdmlkZXIgZGlkIG5vdCBjbGFpbSBiZWZvcmUgdGhlIGRlYWRsaW5lLgAAAAAAAAZyZWZ1bmQAAAAAAAEAAAAAAAAAAmlkAAAAAAAGAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAFtQcm92aWRlciBjbGFpbXMgYSBwZW5kaW5nIHBheW1lbnQgb24gb3IgYmVmb3JlIHRoZSBkZWFkbGluZS4gRnVuZHMgZ28gb25seSB0byB0aGUgcHJvdmlkZXIuAAAAAAdyZWxlYXNlAAAAAAEAAAAAAAAAAmlkAAAAAAAGAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAALZ2V0X3BheW1lbnQAAAAAAQAAAAAAAAACaWQAAAAAAAYAAAABAAAD6QAAB9AAAAAHUGF5bWVudAAAAAAD",
        "AAAAAAAAAAAAAAALaXNfdmVyaWZpZWQAAAAAAQAAAAAAAAAIcHJvdmlkZXIAAAATAAAAAQAAAAE=",
        "AAAAAAAAAAAAAAAMZ2V0X3Byb3ZpZGVyAAAAAQAAAAAAAAAIcHJvdmlkZXIAAAATAAAAAQAAA+gAAAfQAAAACFByb3ZpZGVy",
        "AAAAAAAAAFhTZXQgYXQgZGVwbG95IHRpbWU6IHRoZSBhZG1pbiAod2hvIHZlcmlmaWVzIHByb3ZpZGVycykgYW5kIHRoZSBwYXltZW50IHRva2VuIChVU0RDIFNBQykuAAAADV9fY29uc3RydWN0b3IAAAAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABXRva2VuAAAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAANYWRtaW5fYWRkcmVzcwAAAAAAAAAAAAABAAAAEw==",
        "AAAAAAAAAAAAAAANcGF5bWVudF9jb3VudAAAAAAAAAAAAAABAAAABg==",
        "AAAAAAAAAAAAAAANdG9rZW5fYWRkcmVzcwAAAAAAAAAAAAABAAAAEw==",
        "AAAAAAAAAAAAAAAPcmVtb3ZlX3Byb3ZpZGVyAAAAAAEAAAAAAAAACHByb3ZpZGVyAAAAEwAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAAAAAAAARcmVnaXN0ZXJfcHJvdmlkZXIAAAAAAAADAAAAAAAAAAhwcm92aWRlcgAAABMAAAAAAAAABG5hbWUAAAAQAAAAAAAAAAhjYXRlZ29yeQAAB9AAAAAIQ2F0ZWdvcnkAAAAA" ]),
      options
    )
  }
  public readonly fromJSON = {
    pay: this.txFromJSON<Result<u64>>,
        refund: this.txFromJSON<Result<void>>,
        release: this.txFromJSON<Result<void>>,
        get_payment: this.txFromJSON<Result<Payment>>,
        is_verified: this.txFromJSON<boolean>,
        get_provider: this.txFromJSON<Option<Provider>>,
        admin_address: this.txFromJSON<string>,
        payment_count: this.txFromJSON<u64>,
        token_address: this.txFromJSON<string>,
        remove_provider: this.txFromJSON<Result<void>>,
        register_provider: this.txFromJSON<null>
  }
}