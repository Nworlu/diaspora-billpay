import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import { Header } from "@/components/Header";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jbmono" });

export const metadata: Metadata = {
  title: "Diaspora Bill Pay",
  description: "Pay Nigerian school fees, hospital bills and rent in USDC. Escrow on Stellar releases only to verified providers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans text-ink antialiased">
        <WalletProvider>
          <Suspense fallback={<div className="h-[61px] border-b border-slate-200 bg-white" />}><Header /></Suspense>
          <main className="mx-auto max-w-5xl px-5 py-10">{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}
