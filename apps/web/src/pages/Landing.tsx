import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  QrCode,
  ScanLine,
  ShieldCheck,
  Tag,
  Ticket as TicketIcon,
} from 'lucide-react';
import { Logo } from '../components/layout/Logo';
import { Button } from '../components/ui/Button';
import { useStats } from '../lib/queries';
import { CONTRACT_ID, NETWORK } from '../lib/config';
import { contractExplorerUrl } from '@tessera/sdk';

const features = [
  { icon: ShieldCheck, title: 'No fakes', body: 'Every ticket is a unique on-chain NFT. Check-in marks it used — it can’t be copied or used twice.' },
  { icon: Tag, title: 'No scalping', body: 'Resale is capped at a price the organizer sets, enforced by the contract. Bots can’t gouge fans.' },
  { icon: ScanLine, title: 'QR check-in', body: 'Scan at the door. The app verifies ownership on-chain and stamps the ticket in one tap.' },
  { icon: BadgeCheck, title: 'Proof of attendance', body: 'Checking in mints a collectible POAP badge to the attendee’s wallet automatically.' },
];

const steps = [
  { n: '01', title: 'Create an event', body: 'Set tiers, supply and a resale cap. Tickets mint on demand.' },
  { n: '02', title: 'Fans buy tickets', body: 'Each purchase mints an NFT ticket straight to the buyer’s wallet.' },
  { n: '03', title: 'Scan & attend', body: 'At the door, scan the QR — verified on-chain, marked used, badge minted.' },
];

export function Landing() {
  const { data: stats } = useStats();

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/docs">
            <Button variant="ghost" size="sm">
              How it works
            </Button>
          </Link>
          <Link to="/app">
            <Button size="sm">
              Launch app <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-5 pb-16 pt-12 sm:px-8 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-fg-muted"
            >
              <span className="live-dot" /> On-chain ticketing · Stellar {NETWORK}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-5 font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-fg sm:text-6xl"
            >
              Tickets that <br />
              <span className="holo-text">can’t be faked.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-5 max-w-xl text-lg text-fg-muted"
            >
              Tessera turns every event ticket into a unique NFT on Stellar. No counterfeits, no
              double-entry, and resale capped so scalpers can’t gouge. Scan a QR at the door — done.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link to="/app">
                <Button variant="holo" size="lg">
                  Get tickets <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link to="/app/organize">
                <Button variant="outline" size="lg">
                  Create an event
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Floating holo ticket mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative mx-auto w-full max-w-sm"
          >
            <div className="animate-float holo-border overflow-hidden rounded-3xl">
              <div className="relative grid grid-cols-[1fr_auto] gap-4 bg-ink-850 p-6">
                <div className="pointer-events-none absolute inset-0 opacity-10 holo-foil" />
                <div className="relative">
                  <p className="text-[0.65rem] uppercase tracking-[0.18em] text-fg-subtle">VIP · Row A</p>
                  <h3 className="mt-1 font-display text-2xl text-fg">Soroban Summit</h3>
                  <p className="mt-1 text-sm text-fg-muted">Sat, Jun 28 · 2026</p>
                  <div className="mt-6 flex gap-5 text-sm">
                    <div>
                      <p className="text-xs text-fg-subtle">Seat</p>
                      <p className="tnum text-fg">A-12</p>
                    </div>
                    <div>
                      <p className="text-xs text-fg-subtle">Serial</p>
                      <p className="tnum text-fg">#00042</p>
                    </div>
                  </div>
                </div>
                <div className="relative flex flex-col items-center justify-center border-l border-dashed border-white/15 pl-4">
                  <div className="rounded-xl bg-white p-2 text-ink-950">
                    <QrCode className="size-20" />
                  </div>
                  <p className="mt-2 text-[0.6rem] text-fg-subtle">Scan at door</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Stats strip */}
        <div className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Events', value: stats?.totalEvents ?? '—' },
            { label: 'Tickets sold', value: stats?.ticketsSold ?? '—' },
            { label: 'Checked in', value: stats?.checkedIn ?? '—' },
            { label: 'Attendees', value: stats?.uniqueBuyers ?? '—' },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl p-4 text-center">
              <p className="font-display text-3xl text-fg tnum">{s.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-fg-subtle">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="glass-strong rounded-2xl p-6">
              <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-holo-violet/25 to-holo-cyan/20 text-holo-violet">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-display text-lg text-fg">{f.title}</h3>
              <p className="mt-2 text-sm text-fg-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <h2 className="text-center font-display text-3xl font-bold text-fg">How it works</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-white/8 bg-ink-850/50 p-6">
              <span className="font-display text-4xl font-bold text-holo-violet/40 tnum">{s.n}</span>
              <h3 className="mt-3 font-display text-lg text-fg">{s.title}</h3>
              <p className="mt-2 text-sm text-fg-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
        <div className="holo-border overflow-hidden rounded-3xl">
          <div className="relative bg-ink-850 px-8 py-12 text-center">
            <div className="pointer-events-none absolute inset-0 opacity-[0.06] holo-foil" />
            <TicketIcon className="relative mx-auto size-8 text-holo-violet" />
            <h2 className="relative mt-4 font-display text-3xl font-bold text-fg">Ready when you are</h2>
            <p className="relative mx-auto mt-2 max-w-md text-fg-muted">
              Connect a Stellar wallet, grab a ticket, and see the whole flow end-to-end on testnet.
            </p>
            <Link to="/app" className="relative mt-6 inline-block">
              <Button variant="holo" size="lg">
                Launch Tessera <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-fg-subtle sm:flex-row sm:px-8">
          <Logo />
          <p>Built by Can Sarıhan · Stellar {NETWORK}</p>
          <a href={contractExplorerUrl(CONTRACT_ID, NETWORK)} target="_blank" rel="noreferrer" className="transition hover:text-fg">
            Contract ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
