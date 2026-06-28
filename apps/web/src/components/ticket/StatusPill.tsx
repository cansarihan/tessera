import type { Event, Ticket } from '@tessera/sdk';
import { EventStatus } from '@tessera/sdk';
import { Badge } from '../ui/Badge';

export function TicketStatus({ ticket }: { ticket: Ticket }) {
  if (ticket.used) return <Badge tone="neutral">Used</Badge>;
  if (ticket.listPrice > 0n) return <Badge tone="cyan">Listed</Badge>;
  return (
    <Badge tone="valid">
      <span className="live-dot" /> Valid
    </Badge>
  );
}

export function EventStatusPill({ event }: { event: Event }) {
  if (event.status === EventStatus.Canceled) return <Badge tone="danger">Canceled</Badge>;
  const soldOut = event.tiers.every((t) => t.sold >= t.supply);
  if (soldOut) return <Badge tone="warning">Sold out</Badge>;
  if (event.startTime * 1000 < Date.now()) return <Badge tone="neutral">Started</Badge>;
  return <Badge tone="violet">On sale</Badge>;
}
