# Tech stack

Platform: **web** (Next.js, mobile-responsive). A React Native app is a post-hackathon next step.

| Layer | Choice | Why |
|---|---|---|
| Smart contract | Rust + Soroban SDK (`soroban-sdk`), target `wasm32v1-none` | Stellar's native smart contract platform |
| Contract tooling | Stellar CLI 30.x (`stellar contract build/deploy/invoke/bindings`) | Build, deploy, and generate TS clients |
| Network | Stellar **testnet** (Soroban RPC + Horizon) | Free, fast, Friendbot funding |
| Asset | Testnet USDC (Circle faucet) or a self-issued test asset via its Stellar Asset Contract (SAC) | Stablecoin payments |
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS | Existing strengths, fast to ship |
| Wallet | Freighter (`@stellar/freighter-api`), optionally Stellar Wallets Kit | Sign transactions in browser |
| Chain SDK | `@stellar/stellar-sdk` + generated contract bindings (`stellar contract bindings typescript`) | Typed contract calls |
| Cash-out | SEP-10 (auth) + SEP-24 (interactive withdraw) against `testanchor.stellar.org` | Naira off-ramp flow for the demo |
| Explorer | Stellar Expert (testnet) | Receipt / transaction links |
| Hosting | Vercel | One-command deploys |
| Package manager | pnpm | |

## Repo layout

```
contracts/escrow/   Soroban escrow contract + tests
web/                Next.js app (sender, provider, admin, receipt pages)
docs/               Plan, stack, architecture
```

## Architecture

```mermaid
sequenceDiagram
  participant S as Sender (abroad)
  participant W as Web app + Freighter
  participant C as Escrow contract (Soroban)
  participant P as Provider (school/hospital/landlord)
  participant A as Anchor (SEP-24)
  S->>W: Pick verified provider, enter amount + invoice ref
  W->>C: pay(sender, provider, amount, invoice_ref, deadline)
  C-->>W: payment_id + event (on-chain receipt)
  P->>C: release(payment_id)
  C->>P: USDC to provider wallet (only if verified)
  P->>A: SEP-24 withdraw USDC -> NGN
  Note over S,C: If unclaimed after deadline, sender calls refund(payment_id)
```

## Contract interface (draft)

- `init(admin, token)`
- `register_provider(provider, name, category)` (admin only)
- `remove_provider(provider)` (admin only)
- `pay(sender, provider, amount, invoice_ref, deadline) -> u64` (sender auth; provider must be verified)
- `release(id)` (provider auth; pays only the registered provider)
- `refund(id)` (sender auth; only after deadline, only if unreleased)
- `get_payment(id) -> Payment` and `get_provider(addr) -> Provider`
- Events: `paid`, `released`, `refunded`
