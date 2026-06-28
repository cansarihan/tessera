import { useState } from 'react';
import { ExternalLink, Star, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '../lib/wallet';
import { api } from '../lib/api';
import { track } from '../lib/analytics';
import { CONTRACT_ID, NETWORK } from '../lib/config';
import { contractExplorerUrl } from '@tessera/sdk';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, Textarea } from '../components/ui/Field';
import { AddressChip } from '../components/ui/AddressChip';
import { cn } from '../lib/cn';

export function Settings() {
  const { address } = useWallet();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      await api.onboard({ wallet: address ?? undefined, name: name || undefined, email: email || undefined, rating: rating || undefined, note: note || undefined });
      track('onboarded', { rating });
      toast.success('Thanks — you’re on the pilot list!');
      setDone(true);
    } catch {
      toast.error('Could not submit', { description: 'Is the API running?' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Your wallet, the network, and the pilot programme." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 font-display text-lg text-fg">
            <Wallet className="size-5 text-holo-violet" /> Wallet & network
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-fg-muted">Address</dt>
              <dd>{address ? <AddressChip address={address} /> : <span className="text-fg-subtle">Not connected</span>}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-fg-muted">Network</dt>
              <dd className="text-fg capitalize">{NETWORK}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-fg-muted">Contract</dt>
              <dd>
                <a href={contractExplorerUrl(CONTRACT_ID, NETWORK)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-holo-violet hover:underline tnum">
                  {CONTRACT_ID.slice(0, 8)}…{CONTRACT_ID.slice(-6)} <ExternalLink className="size-3.5" />
                </a>
              </dd>
            </div>
          </dl>
          <a href="https://lab.stellar.org/account/fund" target="_blank" rel="noreferrer" className="mt-5 inline-block">
            <Button variant="outline" size="sm">
              Fund a testnet account <ExternalLink className="size-4" />
            </Button>
          </a>
        </Card>

        <Card>
          <h2 className="font-display text-lg text-fg">Join the pilot</h2>
          <p className="mt-1 text-sm text-fg-muted">Tell us who you are and rate Tessera — it shapes what we build next.</p>
          {done ? (
            <div className="mt-6 rounded-xl border border-valid/30 bg-valid/5 p-4 text-sm text-fg">
              🎉 You’re on the list. Thank you!
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name">
                  <Input placeholder="Ada" value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Email">
                  <Input type="email" placeholder="ada@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
              </div>
              <div>
                <p className="mb-1.5 text-sm font-medium text-fg-muted">Rate Tessera</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                      <Star className={cn('size-7 transition', n <= rating ? 'fill-warning text-warning' : 'text-fg-subtle hover:text-fg-muted')} />
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Anything else?">
                <Textarea placeholder="What would make Tessera a must-use?" value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
              <Button loading={submitting} onClick={submit} className="w-full">
                Submit
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
