import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ticket as TicketIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Event, Ticket } from '@tessera/sdk';
import { useEvents, useMyTickets } from '../lib/queries';
import { useWallet } from '../lib/wallet';
import { tessera } from '../lib/client';
import { assetBySac } from '../lib/config';
import { formatToken, parseUnits } from '../lib/format';
import { track } from '../lib/analytics';
import { PageHeader } from '../components/layout/PageHeader';
import { ConnectGate } from '../components/layout/ConnectGate';
import { HoloTicket } from '../components/ticket/HoloTicket';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Field, Input } from '../components/ui/Field';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';

export function MyTickets() {
  const { address } = useWallet();
  return (
    <div>
      <PageHeader title="My tickets" subtitle="Your NFT tickets. Show the QR at the door, or resell within the cap." />
      <ConnectGate message="Connect a wallet to see your tickets.">
        <Inner address={address as string} />
      </ConnectGate>
    </div>
  );
}

function Inner({ address }: { address: string }) {
  const { data: tickets, isLoading } = useMyTickets(address);
  const { data: events } = useEvents();
  const eventMap = useMemo(() => new Map((events ?? []).map((e) => [e.id, e])), [events]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (!tickets || tickets.length === 0) {
    return (
      <EmptyState
        icon={<TicketIcon />}
        title="No tickets yet"
        description="Buy a ticket and it shows up here instantly."
        action={<Link to="/app"><Button>Browse events</Button></Link>}
      />
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {tickets.map((ticket) => {
        const event = eventMap.get(ticket.eventId);
        return event ? <TicketRow key={ticket.id} ticket={ticket} event={event} /> : null;
      })}
    </div>
  );
}

function TicketRow({ ticket, event }: { ticket: Ticket; event: Event }) {
  const { signer } = useWallet();
  const queryClient = useQueryClient();
  const asset = assetBySac(event.token);
  const [listOpen, setListOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [price, setPrice] = useState('');
  const [recipient, setRecipient] = useState('');

  const cap = (event.tiers[ticket.tierIndex]?.price ?? 0n) * BigInt(event.maxResaleBps) / 10000n;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
    void queryClient.invalidateQueries({ queryKey: ['event', event.id] });
  };

  const list = useMutation({
    mutationFn: async () => {
      if (!signer) throw new Error('No wallet');
      const value = parseUnits(price, asset.decimals);
      return tessera.listTicket(ticket.id, value, signer);
    },
    onSuccess: () => {
      track('ticket_listed', { ticketId: ticket.id });
      toast.success('Listed for resale');
      setListOpen(false);
      setPrice('');
      invalidate();
    },
    onError: (e: Error) => toast.error('Could not list', { description: e.message }),
  });

  const unlist = useMutation({
    mutationFn: async () => {
      if (!signer) throw new Error('No wallet');
      return tessera.unlistTicket(ticket.id, signer);
    },
    onSuccess: () => {
      toast.success('Removed from resale');
      invalidate();
    },
    onError: (e: Error) => toast.error('Could not unlist', { description: e.message }),
  });

  const transfer = useMutation({
    mutationFn: async () => {
      if (!signer) throw new Error('No wallet');
      return tessera.transferTicket(ticket.id, recipient.trim(), signer);
    },
    onSuccess: () => {
      track('ticket_transferred', { ticketId: ticket.id });
      toast.success('Ticket transferred');
      setTransferOpen(false);
      setRecipient('');
      invalidate();
    },
    onError: (e: Error) => toast.error('Transfer failed', { description: e.message }),
  });

  return (
    <div className="space-y-3">
      <HoloTicket ticket={ticket} event={event} />
      {!ticket.used && (
        <div className="flex flex-wrap gap-2">
          {ticket.listPrice > 0n ? (
            <Button size="sm" variant="outline" loading={unlist.isPending} onClick={() => unlist.mutate()}>
              Unlist
            </Button>
          ) : (
            event.maxResaleBps > 0 && (
              <Button size="sm" variant="outline" onClick={() => setListOpen(true)}>
                List for resale
              </Button>
            )
          )}
          <Button size="sm" variant="ghost" onClick={() => setTransferOpen(true)}>
            Transfer
          </Button>
        </div>
      )}

      <Modal
        open={listOpen}
        onClose={() => setListOpen(false)}
        title="List for resale"
        footer={
          <>
            <Button variant="ghost" onClick={() => setListOpen(false)}>Cancel</Button>
            <Button loading={list.isPending} disabled={!price} onClick={() => list.mutate()}>List</Button>
          </>
        }
      >
        <Field
          label={`Price (${asset.code})`}
          hint={`Max allowed: ${formatToken(cap, asset.decimals, 2)} ${asset.code} (${(event.maxResaleBps / 100).toFixed(0)}% cap)`}
        >
          <Input type="number" min={0} step="0.01" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
      </Modal>

      <Modal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="Transfer ticket"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button loading={transfer.isPending} disabled={!recipient.trim()} onClick={() => transfer.mutate()}>Transfer</Button>
          </>
        }
      >
        <Field label="Recipient address" hint="Gift this ticket to another Stellar address.">
          <Input placeholder="G…" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
        </Field>
      </Modal>
    </div>
  );
}
