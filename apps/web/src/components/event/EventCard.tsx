import { Link } from 'react-router-dom';
import { CalendarClock, Ticket as TicketIcon } from 'lucide-react';
import type { Event } from '@tessera/sdk';
import { assetBySac } from '../../lib/config';
import { formatDate, formatToken, untilEvent } from '../../lib/format';
import { EventStatusPill } from '../ticket/StatusPill';

export function EventCard({ event }: { event: Event }) {
  const asset = assetBySac(event.token);
  const minPrice = event.tiers.reduce((m, t) => (t.price < m ? t.price : m), event.tiers[0]?.price ?? 0n);
  const left = event.tiers.reduce((acc, t) => acc + (t.supply - t.sold), 0);
  const supply = event.tiers.reduce((acc, t) => acc + t.supply, 0);

  return (
    <Link
      to={`/app/event/${event.id}`}
      className="group block overflow-hidden rounded-2xl border border-white/8 bg-ink-850/60 transition hover:-translate-y-0.5 hover:border-white/15"
    >
      <div className="relative h-24 holo-foil opacity-90">
        <div className="absolute inset-0 bg-gradient-to-t from-ink-850 to-transparent" />
        <div className="absolute right-3 top-3">
          <EventStatusPill event={event} />
        </div>
      </div>
      <div className="p-5">
        <h3 className="truncate font-display text-lg text-fg">{event.name}</h3>
        <div className="mt-2 flex items-center gap-2 text-sm text-fg-muted">
          <CalendarClock className="size-4" />
          {formatDate(event.startTime)} · <span className="text-fg-subtle">{untilEvent(event.startTime)}</span>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-4">
          <div>
            <p className="text-xs text-fg-subtle">From</p>
            <p className="font-display text-fg">
              {formatToken(minPrice, asset.decimals, 2)} {asset.code}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-fg-muted">
            <TicketIcon className="size-4" />
            <span className="tnum">{left}</span>/{supply} left
          </div>
        </div>
      </div>
    </Link>
  );
}
