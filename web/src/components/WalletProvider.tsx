"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { connectFreighter, currentAddress } from "@/lib/wallet";

type Ctx = { address: string | null; connect: () => Promise<void>; error: string | null };
const WalletCtx = createContext<Ctx>({ address: null, connect: async () => {}, error: null });

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    currentAddress().then(setAddress);
  }, []);
  const connect = async () => {
    setError(null);
    try {
      setAddress(await connectFreighter());
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return <WalletCtx.Provider value={{ address, connect, error }}>{children}</WalletCtx.Provider>;
}

export const useWallet = () => useContext(WalletCtx);
