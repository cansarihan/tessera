import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Scanner } from '@yudiel/react-qr-scanner';
import { CheckCircle2, ScanLine, XCircle } from 'lucide-react';
import { decodeTicketQr } from '@tessera/sdk';
import { tessera } from '../lib/client';
import { useWallet } from '../lib/wallet';
import { track } from '../lib/analytics';
import { PageHeader } from '../components/layout/PageHeader';
import { ConnectGate } from '../components/layout/ConnectGate';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';

interface ScanResult {
  ok: boolean;
  msg: string;
  ticketId?: number;
}

export function Scan() {
  return (
    <div>
      <PageHeader
        title="Check-in scanner"
        subtitle="Organizers only: scan a ticket QR to verify it on-chain and mark it used. A POAP badge is minted to the attendee."
      />
      <ConnectGate message="Connect the organizer wallet to check guests in.">
        <Inner />
      </ConnectGate>
    </div>
  );
}

function Inner() {
  const { signer } = useWallet();
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);

  const checkIn = useMutation({
    mutationFn: async (ticketId: number) => {
      if (!signer) throw new Error('Connect the organizer wallet');
      const ticket = await tessera.getTicket(ticketId);
      if (ticket.used) throw new Error(`Ticket #${ticketId} was already used`);
      const badgeId = await tessera.checkIn(ticketId, signer);
      return { ticketId, badgeId };
    },
    onSuccess: ({ ticketId, badgeId }) => {
      track('check_in', { ticketId });
      setResult({ ok: true, msg: `Checked in · POAP badge #${badgeId} minted`, ticketId });
    },
    onError: (e: Error) => setResult({ ok: false, msg: e.message }),
  });

  function handleValue(value: string) {
    const payload = decodeTicketQr(value);
    const ticketId = payload ? payload.t : Number(value);
    if (!Number.isInteger(ticketId) || ticketId < 0) {
      setResult({ ok: false, msg: 'Unrecognized code' });
      return;
    }
    checkIn.mutate(ticketId);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card>
        <h2 className="font-display text-lg text-fg">Scan a QR</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          {scanning ? (
            <Scanner
              onScan={(codes) => {
                const raw = codes[0]?.rawValue;
                if (raw) {
                  setScanning(false);
                  handleValue(raw);
                }
              }}
              onError={() => setScanning(false)}
              styles={{ container: { width: '100%' } }}
            />
          ) : (
            <button
              onClick={() => {
                setResult(null);
                setScanning(true);
              }}
              className="flex aspect-square w-full flex-col items-center justify-center gap-3 text-fg-muted transition hover:text-fg"
            >
              <ScanLine className="size-12" />
              <span className="text-sm">Tap to start camera</span>
            </button>
          )}
        </div>
        {scanning && (
          <Button className="mt-3" variant="ghost" size="sm" onClick={() => setScanning(false)}>
            Stop
          </Button>
        )}
      </Card>

      <div className="space-y-6">
        <Card>
          <h2 className="font-display text-lg text-fg">Manual check-in</h2>
          <p className="mt-1 text-sm text-fg-muted">No camera? Enter the ticket serial.</p>
          <div className="mt-4 flex items-end gap-3">
            <div className="flex-1">
              <Field label="Ticket id">
                <Input type="number" min={0} placeholder="0" value={manual} onChange={(e) => setManual(e.target.value)} />
              </Field>
            </div>
            <Button loading={checkIn.isPending} disabled={manual === ''} onClick={() => handleValue(manual)}>
              Check in
            </Button>
          </div>
        </Card>

        {result && (
          <Card className={result.ok ? 'border-valid/30' : 'border-danger/30'}>
            <div className="flex items-start gap-3">
              {result.ok ? (
                <CheckCircle2 className="size-7 shrink-0 text-valid" />
              ) : (
                <XCircle className="size-7 shrink-0 text-danger" />
              )}
              <div>
                <p className="font-display text-lg text-fg">
                  {result.ok ? 'Valid — admitted' : 'Not admitted'}
                  {result.ticketId !== undefined && (
                    <span className="ml-2 text-sm text-fg-subtle tnum">#{String(result.ticketId).padStart(5, '0')}</span>
                  )}
                </p>
                <p className="mt-1 text-sm text-fg-muted">{result.msg}</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
