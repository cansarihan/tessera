<div align="center">

# Tessera

### On-chain event ticketing on Stellar — impossible to counterfeit, capped against scalping

Every ticket is a unique NFT on Soroban. Buy it to your wallet, show a QR at the door, and the
organizer verifies it on-chain and marks it used — so a ticket can't be faked, copied, or used
twice. Resale is price-capped on-chain, so scalpers can't gouge.

[Live demo](#) · [Pitch deck](#) · [Demo video](#) · [Contract on testnet](https://stellar.expert/explorer/testnet/contract/CBPKPVNYRW6HS7ZZYAB6QZ45FHJTA2XWJBAPWTV2R5UBED4SCROPMLFG) · Built by **Can Sarıhan**

</div>

---

## Problem

Event ticketing is broken in two ways: **fakes** (counterfeit / screenshotted / double-sold tickets)
and **scalping** (bots buy out inventory and resell at huge markups). Both hurt fans and organizers,
and the trust gap is filled by expensive intermediaries.

## Solution

Tessera makes each ticket a **unique, on-chain NFT** and enforces the rules in a Soroban contract:

- **No fakes** — ownership is on-chain; check-in marks the ticket `used`, so it can't be reused or copied.
- **No scalping** — resale is capped at a max price set by the organizer, enforced by the contract.
- **QR check-in** — the door scans a QR; the app verifies the holder owns a valid, unused ticket and stamps it.
- **Proof of attendance** — checking in mints a collectible POAP badge to the attendee.

## Architecture

```
tessera/
├── contracts/tessera   Soroban (Rust) — events, NFT tickets, buy, capped resale, check-in, POAP
├── packages/sdk        TypeScript SDK — typed client + QR payload helpers
├── apps/api            Express + libSQL — indexer, REST API, feedback, Google Form responses
└── apps/web            React + Vite + Tailwind — the "Holographic" UI: browse, buy, my tickets, scanner
```

## Status

Built for **Risein Level 5 (Blue Belt)** — scaling, iteration, and presentation. Live links, pitch
deck and demo are tracked here as they go live.

## License

MIT © Can Sarıhan
