# Build plan: Stellar Buildathon (Nigeria chapter)

Build: online, Nov 25 to Dec 1, 2026. Top 10 pitch in person in Lagos on Dec 4/5. Top 2 may be recommended for SCF InstaAwards (up to $15k in XLM).

Goal: one end-to-end flow working on testnet. Depth over breadth.

## MVP scope
- Escrow contract: register provider, pay, release, refund, get_payment, events
- Sender page: connect Freighter, choose provider, pay, see receipt
- Provider page: see pending payments, claim, cash out via SEP-24 test anchor
- Admin page: register demo providers (school, hospital, landlord)
- Receipt page: by payment id, with explorer link

Out of scope (pitch as next steps): KYC, multi-currency, notifications, mobile app, real anchor.

## Status
- [x] Rust, Stellar CLI, testnet key `alice`, hello-world deployed (Nov 20)
- [x] Repo created
- [x] Escrow contract + 16 unit tests (incl. auth tests), typed events, deadline window 3 to 30 days (Nov 20)
- [x] Escrow deployed to testnet with test USDC, 3 providers seeded, pay + release smoke test (see DEPLOYMENTS.md)
- [ ] Confirm buildathon rules on code written before Nov 25

## Day by day
| Day | Tasks | Done when |
|---|---|---|
| Nov 21–24 | Next.js + Freighter calling hello-world; read Soroban auth, token interface, events docs | Browser signs and calls a contract |
| Nov 25 | Deploy escrow to testnet with test USDC; seed providers; start SEP-24 spike early (riskiest part) | Contract id in README, test anchor auth works |
| Nov 26 | TS bindings; sender flow (connect, pick provider, pay, show id + tx link) | Real testnet payment from UI |
| Nov 27 | Provider flow (list + claim); admin register; seed 3 providers | Provider receives USDC |
| Nov 28 | SEP-10 + SEP-24 withdraw with test anchor (cap: half a day) | Cash-out popup completes or reaches hand-off |
| Nov 29 | Receipt page, refund path, errors/loading, mobile polish | Full demo runs without help |
| Nov 30 | Feature freeze; deploy to Vercel; README | Live URL works |
| Dec 1 | Record 2–3 min demo; final repo check; submit early | Submitted |

## Demo flow (~2 min)
1. Problem: a sender in London paying Lagos school fees; slow, costly, money can be misused.
2. Sender connects wallet, picks a verified school, pays 50 USDC, gets an on-chain receipt.
3. School claims; contract releases only to the verified wallet.
4. School cashes out to naira through the anchor.
5. Unclaimed after deadline: sender refunds.

## Submission checklist
- [ ] Public repo with `contracts/` and `web/`, tests passing
- [ ] README: problem, how it works, architecture, testnet contract ids, live link, setup
- [ ] Demo video (YouTube unlisted or Loom) + screenshots
- [ ] Live deploy on Vercel

## Pitch prep (Dec 4/5)
- 5 slides: problem, solution, demo, why Stellar (cheap USDC + anchors), next steps
- Founder angle: 4+ years in fintech/payments (wallets, KYC, cards)
- 3-minute rehearsal + recorded backup demo
- Prep answers: regulation, provider verification, fees, go-to-market

## Calendar note
ETH Lagos is Nov 27–28 (mid build week). Skip or drop in briefly.
