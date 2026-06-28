import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarClock, ShieldCheck, Tag, Ticket as TicketIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Ticket } from '@tessera/sdk';
import { useEvent } from '../lib/queries';
import { useWallet } from '../lib/wallet';
import { tessera } from '../lib/client';
import { assetBySac } from '../lib/config';
import { formatDateTime, formatToken, untilEvent } from '../lib/format';
import { track } from '../lib/analytics';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input, Field } from '../components/ui/Field';
import { Skeleton } from '../components/ui/Skeleton';
import { AddressChip } from '../components/ui/AddressChip';
import { EmptyState } from '../components/ui/EmptyState';
import { EventStatusPill } from '../components/ticket/StatusPill';
import { cn } from '../lib/cn';

export function EventDetail() {
  const { id } = useParams();
  const eventId = id ? Number(id) : null;
  const { data, isLoading, isError } = useEvent(eventId);
  const { address, signer, connect } = useWallet();
  const queryClient = useQueryClient();

  const [tierIndex, setTierIndex] = useState(0);
  const [seat, setSeat] = useState('');

  const buy = useMutation({
    mutationFn: async () => {
      if (!signer) throw new Error('Connect a wallet first');
      return tessera.buyTicket(eventId as number, tierIndex, seat ? Number(seat) : 0, signer);
    },
    onSuccess: (ticketId) => {
      track('ticket_bought', { eventId, tierIndex, ticketId });
      toast.success('Ticket minted to your wallet!', { description: `Serial #${String(ticketId).padStart(5, '0')}` });
      setSeat('');
      void queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      void queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
    },
    onError: (err: Error) => toast.error('Purchase failed', { description: err.message }),
  });

  const resale = useMutation({
    mutationFn: async (ticket: Ticket) => {
      if (!signer) throw new Error('Connect a wallet first');
      return tessera.buyResale(ticket.id, signer);
    },
    onSuccess: () => {
      toast.success('Resale ticket purchased!');
      void queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      void queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
    },
    onError: (err: Error) => toast.error('Resale purchase failed', { description: err.message }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }
  if (isError || !data) {
    return <EmptyState icon={<TicketIcon />} title="Event not found" description="This event id doesn’t exist on the contract." action={<Link to="/app"><Button>Browse events</Button></Link>} />;
  }

  const { event, tickets } = data;
  const asset = assetBySac(event.token);
  const tier = event.tiers[tierIndex];
  const soldOut = tier ? tier.sold >= tier.supply : true;
  const listings = tickets.filter((t) => t.listPrice > 0n && !t.used);
  const capPct = (event.maxResaleBps / 100).toFixed(0);

  return (
    <div>
      <Link to="/app" className="mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted transition hover:text-fg">
        <ArrowLeft className="size-4" /> All events
      </Link>

      {/* Banner */}
      <div className="holo-border overflow-hidden rounded-2xl">
        <div className="relative bg-ink-850 p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-[0.06] holo-foil" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <EventStatusPill event={event} />
              <h1 className="mt-3 font-display text-3xl font-bold text-fg sm:text-4xl">{event.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-fg-muted">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="size-4" /> {formatDateTime(event.startTime)} · {untilEvent(event.startTime)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  Organizer <AddressChip address={event.organizer} />
                </span>
              </div>
            </div>
            <Badge tone="cyan" className="gap-1">
              <Tag className="size-3.5" /> Resale cap {capPct}%
            </Badge>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Tier picker + buy */}
        <Card>
          <h2 className="font-display text-lg text-fg">Choose a tier</h2>
          <div className="mt-4 space-y-3">
            {event.tiers.map((t, i) => {
              const out = t.sold >= t.supply;
              return (
                <button
                  key={i}
                  disabled={out}
                  onClick={() => setTierIndex(i)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl border p-4 text-left transition disabled:opacity-50',
                    i === tierIndex ? 'border-holo-violet/60 bg-holo-violet/10' : 'border-white/10 hover:border-white/20'
                  )}
                >
                  <div>
                    <p className="font-medium text-fg">{t.name}</p>
                    <p className="text-xs text-fg-subtle tnum">
                      {t.supply - t.sold} / {t.supply} left
                    </p>
                  </div>
                  <p className="font-display text-lg text-fg">
                    {formatToken(t.price, asset.decimals, 2)} {asset.code}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 max-w-[10rem]">
            <Field label="Seat (optional)" hint="0 = general admission">
              <Input type="number" min={0} placeholder="0" value={seat} onChange={(e) => setSeat(e.target.value)} />
            </Field>
          </div>

          <div className="mt-5">
            {!address ? (
              <Button onClick={connect} className="w-full sm:w-auto">
                Connect wallet to buy
              </Button>
            ) : (
              <Button
                variant="holo"
                loading={buy.isPending}
                disabled={soldOut || event.status !== 0}
                onClick={() => buy.mutate()}
                className="w-full sm:w-auto"
              >
                {soldOut ? 'Sold out' : `Buy ${tier ? formatToken(tier.price, asset.decimals, 2) : ''} ${asset.code}`}
              </Button>
            )}
          </div>
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-fg-subtle">
            <ShieldCheck className="size-3.5 text-valid" /> Mints a unique NFT ticket to your wallet
          </p>
        </Card>

        {/* Resale listings */}
        <Card>
          <h2 className="font-display text-lg text-fg">Resale market</h2>
          <p className="mt-1 text-sm text-fg-muted">Capped at {capPct}% of face value.</p>
          <div className="mt-4 space-y-3">
            {listings.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-fg-subtle">
                No tickets listed for resale.
              </p>
            ) : (
              listings.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-white/10 p-3">
                  <div>
                    <p className="text-sm text-fg tnum">#{String(t.id).padStart(5, '0')}</p>
                    <p className="text-xs text-fg-subtle">{event.tiers[t.tierIndex]?.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-display text-fg">
                      {formatToken(t.listPrice, asset.decimals, 2)} {asset.code}
                    </p>
                    <Button size="sm" loading={resale.isPending} disabled={!address || t.owner === address} onClick={() => resale.mutate(t)}>
                      Buy
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
