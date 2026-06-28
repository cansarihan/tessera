import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Repeat } from 'lucide-react';
import { toast } from 'sonner';
import type { Event, Ticket } from '@tessera/sdk';
import { useMarket } from '../lib/queries';
import { useWallet } from '../lib/wallet';
import { tessera } from '../lib/client';
import { assetBySac } from '../lib/config';
import { formatToken } from '../lib/format';
import { track } from '../lib/analytics';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';

export function Market() {
  const { data: listings, isLoading } = useMarket();
  const { address, signer, connect } = useWallet();
  const queryClient = useQueryClient();

  const buy = useMutation({
    mutationFn: async (ticket: Ticket) => {
      if (!signer) throw new Error('Connect a wallet first');
      return tessera.buyResale(ticket.id, signer);
    },
    onSuccess: () => {
      track('resale_bought');
      toast.success('Resale ticket purchased!');
      void queryClient.invalidateQueries({ queryKey: ['market'] });
      void queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
    },
    onError: (e: Error) => toast.error('Purchase failed', { description: e.message }),
  });

  return (
    <div>
      <PageHeader title="Resale market" subtitle="Every listing is capped by the organizer’s resale limit — fair secondary sales, no scalping." />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : !listings || listings.length === 0 ? (
        <EmptyState icon={<Repeat />} title="No resale listings" description="When holders list tickets within the cap, they show up here." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map(({ ticket, event }: { ticket: Ticket; event: Event }) => {
            const asset = assetBySac(event.token);
            return (
              <Card key={ticket.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <Link to={`/app/event/${event.id}`} className="font-display text-fg hover:underline">
                      {event.name}
                    </Link>
                    <p className="mt-1 text-xs text-fg-subtle tnum">
                      #{String(ticket.id).padStart(5, '0')} · {event.tiers[ticket.tierIndex]?.name}
                    </p>
                  </div>
                  <Badge tone="cyan">{(event.maxResaleBps / 100).toFixed(0)}% cap</Badge>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-4">
                  <p className="font-display text-xl text-fg">
                    {formatToken(ticket.listPrice, asset.decimals, 2)} {asset.code}
                  </p>
                  {!address ? (
                    <Button size="sm" onClick={connect}>
                      Connect
                    </Button>
                  ) : (
                    <Button size="sm" loading={buy.isPending} disabled={ticket.owner === address} onClick={() => buy.mutate(ticket)}>
                      {ticket.owner === address ? 'Yours' : 'Buy'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
