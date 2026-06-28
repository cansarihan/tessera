import { useMemo } from 'react';
import { Medal } from 'lucide-react';
import { useEvents, useMyBadges } from '../lib/queries';
import { useWallet } from '../lib/wallet';
import { formatDate } from '../lib/format';
import { PageHeader } from '../components/layout/PageHeader';
import { ConnectGate } from '../components/layout/ConnectGate';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';

export function Badges() {
  const { address } = useWallet();
  return (
    <div>
      <PageHeader title="My badges" subtitle="Proof-of-attendance badges, minted to your wallet when you check in at an event." />
      <ConnectGate message="Connect a wallet to see your POAP badges.">
        <Inner address={address as string} />
      </ConnectGate>
    </div>
  );
}

function Inner({ address }: { address: string }) {
  const { data: badges, isLoading } = useMyBadges(address);
  const { data: events } = useEvents();
  const eventMap = useMemo(() => new Map((events ?? []).map((e) => [e.id, e])), [events]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (!badges || badges.length === 0) {
    return <EmptyState icon={<Medal />} title="No badges yet" description="Attend an event and check in to earn your first proof-of-attendance badge." />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {badges.map((badge) => {
        const event = eventMap.get(badge.eventId);
        return (
          <div key={badge.id} className="holo-border overflow-hidden rounded-2xl">
            <div className="relative flex flex-col items-center gap-3 bg-ink-850 p-6 text-center">
              <div className="pointer-events-none absolute inset-0 opacity-10 holo-foil" />
              <div className="relative flex size-16 items-center justify-center rounded-full holo-foil text-ink-950">
                <Medal className="relative z-10 size-8" />
              </div>
              <div className="relative">
                <p className="font-display text-lg text-fg">{event?.name ?? `Event #${badge.eventId}`}</p>
                <p className="mt-1 text-xs text-fg-subtle">Attended · {formatDate(badge.mintedAt)}</p>
                <p className="mt-2 text-[0.65rem] uppercase tracking-[0.18em] text-fg-subtle tnum">Badge #{String(badge.id).padStart(4, '0')}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
