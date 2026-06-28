import { scValToNative, xdr } from '@stellar/stellar-sdk';
import type { TesseraClient } from '@tessera/sdk';
import type { AppConfig } from './config';
import type { Db } from './db';

const TICKET_EVENTS = new Set(['bought', 'listed', 'resold', 'transfer', 'checkin']);

function jsonSafe(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = jsonSafe(v);
    return out;
  }
  return value;
}
function decodeValue(value: xdr.ScVal): unknown {
  try {
    return jsonSafe(scValToNative(value));
  } catch {
    return null;
  }
}

/**
 * Keeps the local DB in sync with the contract: backfills every event and ticket on startup (so the
 * DB is complete regardless of event retention), then polls `getEvents` and re-reads affected
 * records. The contract stays the source of truth.
 */
export class Indexer {
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly client: TesseraClient,
    private readonly db: Db,
    private readonly cfg: AppConfig
  ) {}

  async start(): Promise<void> {
    await this.backfill();
    this.running = true;
    void this.loop();
  }
  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
  }

  async backfill(): Promise<void> {
    try {
      const te = await this.client.totalEvents();
      for (let i = 0; i < te; i++) {
        try {
          await this.db.upsertEvent(await this.client.getEvent(i), null);
        } catch {
          /* skip */
        }
      }
      const tt = await this.client.totalTickets();
      for (let i = 0; i < tt; i++) {
        try {
          await this.db.upsertTicket(await this.client.getTicket(i), null);
        } catch {
          /* skip */
        }
      }
      console.log(`[indexer] backfilled ${te} event(s), ${tt} ticket(s) from contract`);
    } catch (err) {
      console.warn('[indexer] backfill failed:', (err as Error).message);
    }
  }

  private async loop(): Promise<void> {
    if (!this.running) return;
    try {
      await this.tick();
    } catch (err) {
      console.warn('[indexer] tick error:', (err as Error).message);
    }
    this.timer = setTimeout(() => void this.loop(), this.cfg.indexerIntervalMs);
  }

  async tick(): Promise<void> {
    const server = this.client.rpcServer;
    const latest = await server.getLatestLedger();
    const cursorRaw = await this.db.getMeta('cursor_ledger');
    let startLedger = cursorRaw
      ? Number(cursorRaw)
      : Math.max(1, latest.sequence - this.cfg.indexerLookbackLedgers);
    if (startLedger > latest.sequence) startLedger = latest.sequence;

    const res = await server.getEvents({
      startLedger,
      filters: [{ type: 'contract', contractIds: [this.cfg.contractId] }],
      limit: 200,
    });

    for (const ev of res.events) {
      const topics = ev.topic.map((t) => scValToNative(t)) as unknown[];
      const type = String(topics[0]);
      const refId = topics.length > 1 ? Number(topics[1]) : null;
      const txHash = ev.txHash ?? null;
      if (txHash && (await this.db.activityExists(txHash, type))) continue;

      await this.db.insertActivity({
        type,
        refId,
        ledger: ev.ledger,
        txHash,
        data: decodeValue(ev.value),
        createdAt: Date.now(),
      });

      try {
        if (type === 'evt_new' && refId !== null) {
          await this.db.upsertEvent(await this.client.getEvent(refId), txHash);
        } else if (TICKET_EVENTS.has(type) && refId !== null) {
          const ticket = await this.client.getTicket(refId);
          await this.db.upsertTicket(ticket, txHash);
          await this.db.upsertEvent(await this.client.getEvent(ticket.eventId), null);
        }
      } catch {
        /* read failed; next pass retries */
      }
    }

    await this.db.setMeta('cursor_ledger', String(res.latestLedger + 1));
  }
}
