import { createClient, type Client } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Event, Ticket } from '@tessera/sdk';

export interface ApiTier {
  name: string;
  price: string;
  supply: number;
  sold: number;
}
export interface ApiEvent {
  id: number;
  organizer: string;
  name: string;
  token: string;
  maxResaleBps: number;
  startTime: number;
  status: number;
  createdAt: number;
  tiers: ApiTier[];
  txHash: string | null;
}
export interface ApiTicket {
  id: number;
  eventId: number;
  tierIndex: number;
  owner: string;
  used: boolean;
  seat: number;
  listPrice: string;
  createdAt: number;
  txHash: string | null;
}
export interface ApiActivity {
  type: string;
  refId: number | null;
  ledger: number | null;
  txHash: string | null;
  data: unknown;
  createdAt: number;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY, organizer TEXT, name TEXT, token TEXT,
  max_resale_bps INTEGER, start_time INTEGER, status INTEGER, created_at INTEGER,
  tiers TEXT, tx_hash TEXT, updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY, event_id INTEGER, tier_index INTEGER, owner TEXT,
  used INTEGER, seat INTEGER, list_price TEXT, created_at INTEGER, tx_hash TEXT, updated_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_tickets_owner ON tickets(owner);
CREATE INDEX IF NOT EXISTS idx_tickets_event ON tickets(event_id);

CREATE TABLE IF NOT EXISTS activity (
  uid INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, ref_id INTEGER,
  ledger INTEGER, tx_hash TEXT, data TEXT, created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT, wallet TEXT, rating INTEGER,
  message TEXT NOT NULL, category TEXT, created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, wallet TEXT, props TEXT, created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS onboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT, wallet TEXT, email TEXT, name TEXT,
  rating INTEGER, note TEXT, created_at INTEGER NOT NULL
);
`;

type Row = Record<string, unknown>;

function rowToEvent(r: Row): ApiEvent {
  let tiers: ApiTier[] = [];
  try {
    tiers = r.tiers ? (JSON.parse(String(r.tiers)) as ApiTier[]) : [];
  } catch {
    tiers = [];
  }
  return {
    id: Number(r.id),
    organizer: String(r.organizer),
    name: String(r.name),
    token: String(r.token),
    maxResaleBps: Number(r.max_resale_bps),
    startTime: Number(r.start_time),
    status: Number(r.status),
    createdAt: Number(r.created_at),
    tiers,
    txHash: r.tx_hash == null ? null : String(r.tx_hash),
  };
}

function rowToTicket(r: Row): ApiTicket {
  return {
    id: Number(r.id),
    eventId: Number(r.event_id),
    tierIndex: Number(r.tier_index),
    owner: String(r.owner),
    used: Number(r.used) === 1,
    seat: Number(r.seat),
    listPrice: String(r.list_price),
    createdAt: Number(r.created_at),
    txHash: r.tx_hash == null ? null : String(r.tx_hash),
  };
}

export class Db {
  private constructor(private readonly client: Client) {}

  static async create(url: string, authToken?: string): Promise<Db> {
    if (url.startsWith('file:')) {
      const path = url.slice('file:'.length);
      if (path && path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    }
    const client = createClient(authToken ? { url, authToken } : { url });
    await client.executeMultiple(SCHEMA);
    return new Db(client);
  }

  async getMeta(key: string): Promise<string | null> {
    const r = await this.client.execute({ sql: 'SELECT value FROM meta WHERE key = ?', args: [key] });
    const v = r.rows[0]?.value;
    return v == null ? null : String(v);
  }
  async setMeta(key: string, value: string): Promise<void> {
    await this.client.execute({
      sql: 'INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
      args: [key, value, value],
    });
  }

  // --- events ---
  async upsertEvent(e: Event, txHash: string | null, now = Date.now()): Promise<void> {
    const tiers = JSON.stringify(
      e.tiers.map((t) => ({ name: t.name, price: t.price.toString(), supply: t.supply, sold: t.sold }))
    );
    await this.client.execute({
      sql: `INSERT INTO events (id, organizer, name, token, max_resale_bps, start_time, status, created_at, tiers, tx_hash, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET status=excluded.status, tiers=excluded.tiers,
              tx_hash=COALESCE(excluded.tx_hash, events.tx_hash), updated_at=excluded.updated_at`,
      args: [e.id, e.organizer, e.name, e.token, e.maxResaleBps, e.startTime, e.status, e.createdAt, tiers, txHash, now],
    });
  }
  async getEvent(id: number): Promise<ApiEvent | null> {
    const r = await this.client.execute({ sql: 'SELECT * FROM events WHERE id = ?', args: [id] });
    return r.rows[0] ? rowToEvent(r.rows[0] as Row) : null;
  }
  async allEvents(): Promise<ApiEvent[]> {
    const r = await this.client.execute('SELECT * FROM events ORDER BY id DESC');
    return r.rows.map((row) => rowToEvent(row as Row));
  }

  // --- tickets ---
  async upsertTicket(t: Ticket, txHash: string | null, now = Date.now()): Promise<void> {
    await this.client.execute({
      sql: `INSERT INTO tickets (id, event_id, tier_index, owner, used, seat, list_price, created_at, tx_hash, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET owner=excluded.owner, used=excluded.used,
              list_price=excluded.list_price, tx_hash=COALESCE(excluded.tx_hash, tickets.tx_hash), updated_at=excluded.updated_at`,
      args: [t.id, t.eventId, t.tierIndex, t.owner, t.used ? 1 : 0, t.seat, t.listPrice.toString(), t.createdAt, txHash, now],
    });
  }
  async getTicket(id: number): Promise<ApiTicket | null> {
    const r = await this.client.execute({ sql: 'SELECT * FROM tickets WHERE id = ?', args: [id] });
    return r.rows[0] ? rowToTicket(r.rows[0] as Row) : null;
  }
  async ticketsByOwner(owner: string): Promise<ApiTicket[]> {
    const r = await this.client.execute({
      sql: 'SELECT * FROM tickets WHERE owner = ? ORDER BY id DESC',
      args: [owner],
    });
    return r.rows.map((row) => rowToTicket(row as Row));
  }
  async allTickets(): Promise<ApiTicket[]> {
    const r = await this.client.execute('SELECT * FROM tickets');
    return r.rows.map((row) => rowToTicket(row as Row));
  }

  // --- activity ---
  async insertActivity(a: ApiActivity): Promise<void> {
    await this.client.execute({
      sql: 'INSERT INTO activity(type, ref_id, ledger, tx_hash, data, created_at) VALUES(?, ?, ?, ?, ?, ?)',
      args: [a.type, a.refId, a.ledger, a.txHash, a.data === undefined ? null : JSON.stringify(a.data), a.createdAt],
    });
  }
  async recentActivity(limit = 50): Promise<ApiActivity[]> {
    const r = await this.client.execute({ sql: 'SELECT * FROM activity ORDER BY uid DESC LIMIT ?', args: [limit] });
    return r.rows.map((row) => {
      const x = row as Row;
      return {
        type: String(x.type),
        refId: x.ref_id == null ? null : Number(x.ref_id),
        ledger: x.ledger == null ? null : Number(x.ledger),
        txHash: x.tx_hash == null ? null : String(x.tx_hash),
        data: x.data == null ? null : JSON.parse(String(x.data)),
        createdAt: Number(x.created_at),
      };
    });
  }
  async activityExists(txHash: string, type: string): Promise<boolean> {
    const r = await this.client.execute({
      sql: 'SELECT 1 FROM activity WHERE tx_hash = ? AND type = ? LIMIT 1',
      args: [txHash, type],
    });
    return r.rows.length > 0;
  }

  // --- feedback ---
  async insertFeedback(f: { wallet?: string | null; rating?: number | null; message: string; category?: string | null }): Promise<void> {
    await this.client.execute({
      sql: 'INSERT INTO feedback(wallet, rating, message, category, created_at) VALUES(?, ?, ?, ?, ?)',
      args: [f.wallet ?? null, f.rating ?? null, f.message, f.category ?? null, Date.now()],
    });
  }
  async feedbackSummary(): Promise<{ count: number; averageRating: number | null; recent: Array<{ id: number; wallet: string | null; rating: number | null; message: string; category: string | null; createdAt: number }> }> {
    const agg = await this.client.execute('SELECT COUNT(*) c, AVG(rating) a FROM feedback');
    const aggRow = agg.rows[0] as Row;
    const rows = await this.client.execute('SELECT * FROM feedback ORDER BY id DESC LIMIT 20');
    return {
      count: Number(aggRow?.c ?? 0),
      averageRating: aggRow?.a == null ? null : Number(aggRow.a),
      recent: rows.rows.map((row) => {
        const x = row as Row;
        return {
          id: Number(x.id),
          wallet: x.wallet == null ? null : String(x.wallet),
          rating: x.rating == null ? null : Number(x.rating),
          message: String(x.message),
          category: x.category == null ? null : String(x.category),
          createdAt: Number(x.created_at),
        };
      }),
    };
  }

  // --- analytics ---
  async insertAnalytics(name: string, wallet: string | null, props: unknown): Promise<void> {
    await this.client.execute({
      sql: 'INSERT INTO analytics_events(name, wallet, props, created_at) VALUES(?, ?, ?, ?)',
      args: [name, wallet, props === undefined ? null : JSON.stringify(props), Date.now()],
    });
  }
  async analyticsSummary(): Promise<{ totalEvents: number; uniqueWallets: number; byName: Array<{ name: string; count: number }> }> {
    const total = await this.client.execute('SELECT COUNT(*) c FROM analytics_events');
    const wallets = await this.client.execute('SELECT COUNT(DISTINCT wallet) c FROM analytics_events WHERE wallet IS NOT NULL');
    const byName = await this.client.execute('SELECT name, COUNT(*) count FROM analytics_events GROUP BY name ORDER BY count DESC');
    return {
      totalEvents: Number((total.rows[0] as Row)?.c ?? 0),
      uniqueWallets: Number((wallets.rows[0] as Row)?.c ?? 0),
      byName: byName.rows.map((row) => {
        const x = row as Row;
        return { name: String(x.name), count: Number(x.count) };
      }),
    };
  }

  // --- onboarding (Google-Form-equivalent user records) ---
  async insertOnboard(o: { wallet?: string | null; email?: string | null; name?: string | null; rating?: number | null; note?: string | null }): Promise<void> {
    await this.client.execute({
      sql: 'INSERT INTO onboard(wallet, email, name, rating, note, created_at) VALUES(?, ?, ?, ?, ?, ?)',
      args: [o.wallet ?? null, o.email ?? null, o.name ?? null, o.rating ?? null, o.note ?? null, Date.now()],
    });
  }
  async onboardRows(): Promise<Array<{ id: number; wallet: string | null; email: string | null; name: string | null; rating: number | null; note: string | null; createdAt: number }>> {
    const r = await this.client.execute('SELECT * FROM onboard ORDER BY id DESC');
    return r.rows.map((row) => {
      const x = row as Row;
      return {
        id: Number(x.id),
        wallet: x.wallet == null ? null : String(x.wallet),
        email: x.email == null ? null : String(x.email),
        name: x.name == null ? null : String(x.name),
        rating: x.rating == null ? null : Number(x.rating),
        note: x.note == null ? null : String(x.note),
        createdAt: Number(x.created_at),
      };
    });
  }
}
