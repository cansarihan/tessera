import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEvents } from '../lib/queries';
import { useWallet } from '../lib/wallet';
import { tessera } from '../lib/client';
import { XLM } from '../lib/config';
import { formatToken, parseUnits } from '../lib/format';
import { track } from '../lib/analytics';
import { PageHeader } from '../components/layout/PageHeader';
import { ConnectGate } from '../components/layout/ConnectGate';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { EventStatusPill } from '../components/ticket/StatusPill';

interface TierRow {
  name: string;
  price: string;
  supply: string;
}

export function Organize() {
  return (
    <div>
      <PageHeader title="Organize" subtitle="Create an event, set tiers and a resale cap. Tickets mint to buyers as NFTs." />
      <ConnectGate message="Connect a wallet to create and manage events.">
        <Inner />
      </ConnectGate>
    </div>
  );
}

function Inner() {
  const { address, signer } = useWallet();
  const { data: events } = useEvents();
  const queryClient = useQueryClient();
  const mine = (events ?? []).filter((e) => e.organizer === address);

  const [name, setName] = useState('');
  const [tiers, setTiers] = useState<TierRow[]>([{ name: 'General', price: '1', supply: '100' }]);
  const [resalePct, setResalePct] = useState('110');
  const [startAt, setStartAt] = useState('');

  const create = useMutation({
    mutationFn: async () => {
      if (!signer) throw new Error('No wallet');
      const startTime = startAt ? Math.floor(new Date(startAt).getTime() / 1000) : Math.floor(Date.now() / 1000) + 86400;
      return tessera.createEvent(
        {
          organizer: address as string,
          name: name.trim(),
          token: XLM.sac,
          tiers: tiers.map((t) => ({ name: t.name.trim() || 'General', price: parseUnits(t.price || '0', XLM.decimals), supply: Number(t.supply || '0') })),
          maxResaleBps: Math.round(Number(resalePct || '0') * 100),
          startTime,
        },
        signer
      );
    },
    onSuccess: (id) => {
      track('event_created', { eventId: id });
      toast.success('Event created!', { description: `Event #${id} is live.` });
      setName('');
      setTiers([{ name: 'General', price: '1', supply: '100' }]);
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (e: Error) => toast.error('Could not create event', { description: e.message }),
  });

  const cancel = useMutation({
    mutationFn: async (eventId: number) => {
      if (!signer) throw new Error('No wallet');
      return tessera.cancelEvent(eventId, signer);
    },
    onSuccess: () => {
      toast.success('Event canceled');
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (e: Error) => toast.error('Could not cancel', { description: e.message }),
  });

  const valid = name.trim() && tiers.every((t) => Number(t.supply) > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <h2 className="flex items-center gap-2 font-display text-lg text-fg">
          <CalendarPlus className="size-5 text-holo-violet" /> New event
        </h2>
        <div className="mt-4 space-y-4">
          <Field label="Event name">
            <Input placeholder="Soroban Summit 2026" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>

          <div>
            <p className="mb-1.5 text-sm font-medium text-fg-muted">Ticket tiers</p>
            <div className="space-y-2">
              {tiers.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input placeholder="Tier" value={t.name} onChange={(e) => setTiers((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  <Input className="w-24" type="number" min={0} step="0.01" placeholder="Price" value={t.price} onChange={(e) => setTiers((p) => p.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
                  <Input className="w-20" type="number" min={1} placeholder="Qty" value={t.supply} onChange={(e) => setTiers((p) => p.map((x, j) => (j === i ? { ...x, supply: e.target.value } : x)))} />
                  {tiers.length > 1 && (
                    <button onClick={() => setTiers((p) => p.filter((_, j) => j !== i))} className="text-fg-subtle hover:text-danger" aria-label="Remove tier">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setTiers((p) => [...p, { name: '', price: '0', supply: '50' }])} className="mt-2 inline-flex items-center gap-1 text-sm text-holo-violet hover:underline">
              <Plus className="size-4" /> Add tier
            </button>
            <p className="mt-1 text-xs text-fg-subtle">Prices in {XLM.code}.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Resale cap (%)" hint="0 disables resale">
              <Input type="number" min={0} value={resalePct} onChange={(e) => setResalePct(e.target.value)} />
            </Field>
            <Field label="Starts">
              <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            </Field>
          </div>

          <Button variant="holo" loading={create.isPending} disabled={!valid} onClick={() => create.mutate()} className="w-full">
            Create event
          </Button>
        </div>
      </Card>

      <div>
        <h2 className="mb-3 font-display text-lg text-fg">Your events</h2>
        {mine.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-fg-subtle">No events yet — create your first one.</p>
        ) : (
          <div className="space-y-3">
            {mine.map((e) => {
              const sold = e.tiers.reduce((a, t) => a + t.sold, 0);
              const supply = e.tiers.reduce((a, t) => a + t.supply, 0);
              return (
                <Card key={e.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link to={`/app/event/${e.id}`} className="font-display text-fg hover:underline">
                        {e.name}
                      </Link>
                      <p className="mt-1 text-xs text-fg-subtle tnum">
                        {sold}/{supply} sold · {formatToken(e.tiers.reduce((a, t) => a + t.price * BigInt(t.sold), 0n), XLM.decimals, 2)} {XLM.code}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <EventStatusPill event={e} />
                      {e.status === 0 && (
                        <Button size="sm" variant="ghost" loading={cancel.isPending} onClick={() => cancel.mutate(e.id)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link to="/app/scan">
                      <Badge tone="violet">Open scanner →</Badge>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
