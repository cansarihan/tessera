import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../components/layout/Logo';
import { Button } from '../components/ui/Button';
import { CONTRACT_ID, NETWORK } from '../lib/config';
import { contractExplorerUrl } from '@tessera/sdk';

const sections = [
  {
    h: 'Why Tessera',
    p: 'Event ticketing is plagued by counterfeits and scalping. Both erode trust and push fans toward expensive middlemen. Tessera puts the ticket — and the rules — on-chain.',
  },
  {
    h: 'No fakes',
    p: 'Each ticket is a unique NFT in a Soroban contract. Ownership is public and verifiable. At the door, check-in permanently marks the ticket “used”, so it can’t be reused, copied or screenshotted into a second entry.',
  },
  {
    h: 'No scalping',
    p: 'Organizers set a resale price cap (a percentage of face value). The contract refuses any listing above it, so secondary sales stay fair. Free transfers (gifting) are still allowed.',
  },
  {
    h: 'QR check-in & POAP',
    p: 'Your ticket shows a QR encoding its on-chain id. The organizer scans it, the app verifies ownership, and check-in mints a proof-of-attendance badge to your wallet — a collectible you keep forever.',
  },
  {
    h: 'Why Stellar',
    p: 'Soroban smart contracts plus Stellar’s low fees and fast finality make minting and verifying tickets cheap and instant — practical for real events, not just demos.',
  },
];

export function Docs() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <div className="flex items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        <Link to="/app">
          <Button size="sm" variant="outline">
            <ArrowLeft className="size-4" /> App
          </Button>
        </Link>
      </div>

      <h1 className="mt-10 font-display text-4xl font-bold text-fg">
        How <span className="holo-text">Tessera</span> works
      </h1>

      <div className="mt-8 space-y-8">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="font-display text-xl text-fg">{s.h}</h2>
            <p className="mt-2 leading-relaxed text-fg-muted">{s.p}</p>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-white/8 bg-ink-850/50 p-5 text-sm text-fg-muted">
        Contract ({NETWORK}):{' '}
        <a href={contractExplorerUrl(CONTRACT_ID, NETWORK)} target="_blank" rel="noreferrer" className="tnum text-holo-violet hover:underline">
          {CONTRACT_ID.slice(0, 10)}…{CONTRACT_ID.slice(-6)}
        </a>
      </div>
    </div>
  );
}
