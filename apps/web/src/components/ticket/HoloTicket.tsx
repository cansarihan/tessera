import type { Event, Ticket } from '@tessera/sdk';
import { formatDate } from '../../lib/format';
import { TicketQR } from './TicketQR';
import { TicketStatus } from './StatusPill';

/** The signature ticket-stub card: a holographic border, event details and a QR for the door. */
export function HoloTicket({ ticket, event }: { ticket: Ticket; event: Event }) {
  const tier = event.tiers[ticket.tierIndex];
  return (
    <div className="holo-border overflow-hidden rounded-2xl">
      <div className="relative grid grid-cols-[1fr_auto] gap-4 bg-ink-850 p-5">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] holo-foil" />
        <div className="relative min-w-0">
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-fg-subtle">
            {tier?.name ?? 'Ticket'}
          </p>
          <h3 className="mt-1 truncate font-display text-xl text-fg">{event.name}</h3>
          <p className="mt-1 text-sm text-fg-muted">{formatDate(event.startTime)}</p>
          <div className="mt-4 flex items-center gap-5 text-sm">
            <div>
              <p className="text-xs text-fg-subtle">Seat</p>
              <p className="tnum text-fg">{ticket.seat || 'GA'}</p>
            </div>
            <div>
              <p className="text-xs text-fg-subtle">Serial</p>
              <p className="tnum text-fg">#{String(ticket.id).padStart(5, '0')}</p>
            </div>
          </div>
          <div className="mt-3">
            <TicketStatus ticket={ticket} />
          </div>
        </div>
        <div className="relative flex flex-col items-center justify-center border-l border-dashed border-white/15 pl-4">
          <TicketQR ticketId={ticket.id} owner={ticket.owner} size={116} />
          <p className="mt-2 text-[0.6rem] text-fg-subtle">Scan at the door</p>
        </div>
      </div>
    </div>
  );
}
