# Tessera — Pitch Deck

On-chain event ticketing on Stellar. Built by **Can Sarıhan**.
Live: https://cansarihan.github.io/tessera/

---

## 1 · Problem

Event ticketing loses **billions** to two old problems:

- **Fakes** — counterfeit, screenshotted and double-sold tickets. Fans get turned away at the door.
- **Scalping** — bots buy out inventory in seconds and resell at 3–10× face value.

Today the “solution” is closed platforms and middlemen taking 20–30% in fees while the trust problem
remains.

---

## 2 · Solution

**Tessera puts the ticket — and the rules — on-chain.**

- Each ticket is a **unique NFT** on a Soroban smart contract.
- Check-in **permanently marks it used** → no reuse, no copies, no double-entry.
- Resale is **capped on-chain** at a price the organizer sets → scalpers can’t gouge.
- Check-in mints a **proof-of-attendance (POAP) badge** → a memento fans keep.

---

## 3 · How it works

```
Organizer creates event ──▶ Fan buys ticket (NFT minted to wallet)
        │                              │
        ▼                              ▼
   Sets tiers + resale cap      Shows QR at the door
                                       │
                                       ▼
              Organizer scans ──▶ verified on-chain ──▶ marked used + POAP minted
```

Two transactions per ticket (mint + check-in). No per-scan cost, no intermediary.

---

## 4 · Product

A polished, mobile-first web app — the “Holographic” experience:

- **Browse & buy** tickets across tiers (GA / VIP), optional seat selection.
- **My tickets** with scannable QR codes, transfer and capped resale.
- **Resale market** — fair secondary sales, every listing within the cap.
- **Check-in scanner** — one-tap door verification.
- **POAP badges** gallery + **live analytics** (sales, attendance, feedback).

---

## 5 · Market opportunity

- Global event ticketing is a **$70B+** market growing ~5% a year.
- Secondary (resale) ticketing alone is **$15B+** — the part most broken by scalping.
- Web3 ticketing is early: a credible, low-fee, anti-fraud product can win organizers who hate
  paying 25% to incumbents.

**Beachhead:** crypto/tech events and community meetups already on Stellar — then independent
promoters and venues.

---

## 6 · Why Stellar

- **Soroban** smart contracts for the ticket logic.
- **Low fees + fast finality** make minting and verifying tickets cheap and instant — practical for
  real events, not just demos.
- Native assets (XLM / USDC) for frictionless payments and payouts.

---

## 7 · Architecture

```
contracts/tessera   Soroban — events, NFT tickets, capped resale, check-in, POAP
packages/sdk        TypeScript SDK — typed client + QR helpers
apps/api            Express + Turso — indexer, REST, feedback, analytics, onboarding
apps/web            React + Vite + Tailwind — Holographic UI
```

Contract is the source of truth; the web app reads it directly for freshness and uses the API for
aggregates and product analytics.

---

## 8 · Traction & validation

- Deployed on Stellar testnet; **every event, sale and check-in is publicly verifiable** on
  stellar.expert.
- Onboarded real testnet users with wallet interactions; feedback collected in-app and via a Google
  Form, summarized live on the Analytics page.
- Product iterates on feedback each cycle (see README “How we’re improving Tessera from feedback”).

---

## 9 · Growth strategy

1. **Land** crypto/community events already on Stellar (warm, low-friction).
2. **Viral by design** — every event brings dozens of attendees who each create a wallet + ticket.
3. **Organizer self-serve** — anyone can create an event and sell in minutes.
4. **POAP loop** — badges give fans a reason to return and share.
5. **Referral + showcase** — featured events on the landing page.

---

## 10 · Business model

- **Protocol fee** — a small basis-point fee on primary sales and resales (currently 0 on testnet,
  configurable in the contract).
- Far below the 20–30% incumbents charge, while removing fraud and scalping.
- Optional premium features for organizers (analytics, branded pages, payouts).

---

## 11 · Roadmap

- **Now:** NFT tickets, capped resale, QR check-in, POAP, analytics — live on testnet.
- **Next:** event posters/images, email reminders, organizer payouts dashboard.
- **Later:** Apple/Google Wallet passes, mainnet + USDC, multi-organizer teams, fiat on-ramp.

---

## 12 · Ask

Tessera is a working, end-to-end product on Stellar today. We’re looking for design partners
(event organizers) and ecosystem support to take it to mainnet.

**Built by Can Sarıhan** · [Live demo](https://cansarihan.github.io/tessera/) ·
[GitHub](https://github.com/cansarihan/tessera)
