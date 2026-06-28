import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import type { TesseraClient } from '@tessera/sdk';
import type { AppConfig } from './config';
import type { Db } from './db';

type AsyncHandler = (req: Request, res: Response) => Promise<unknown>;
const wrap =
  (fn: AsyncHandler) =>
  (req: Request, res: Response): void => {
    fn(req, res).catch((err: unknown) => {
      console.error('[api] route error:', err);
      if (!res.headersSent) res.status(500).json({ error: 'internal error' });
    });
  };

async function computeStats(db: Db) {
  const events = await db.allEvents();
  const tickets = await db.allTickets();
  let revenue = 0n;
  const buyers = new Set<string>();
  const organizers = new Set<string>();
  let checkedIn = 0;
  for (const e of events) {
    organizers.add(e.organizer);
    for (const t of e.tiers) revenue += BigInt(t.price) * BigInt(t.sold);
  }
  for (const tk of tickets) {
    buyers.add(tk.owner);
    if (tk.used) checkedIn++;
  }
  return {
    totalEvents: events.length,
    activeEvents: events.filter((e) => e.status === 0).length,
    ticketsSold: tickets.length,
    checkedIn,
    uniqueBuyers: buyers.size,
    organizers: organizers.size,
    revenue: revenue.toString(),
  };
}

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function createApp(db: Db, client: TesseraClient, cfg: AppConfig) {
  const app = express();
  app.use(cors({ origin: cfg.corsOrigin }));
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, network: cfg.network, contractId: cfg.contractId, time: Date.now() });
  });
  app.get('/api/config', (_req, res) => {
    res.json({
      contractId: cfg.contractId,
      rpcUrl: cfg.rpcUrl,
      networkPassphrase: cfg.networkPassphrase,
      network: cfg.network,
    });
  });

  // --- events ---
  app.get('/api/events', wrap(async (_req, res) => {
    res.json({ events: await db.allEvents() });
  }));
  app.get('/api/events/:id', wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 0) return res.status(400).json({ error: 'invalid id' });
    let event = await db.getEvent(id);
    if (!event) {
      try {
        await db.upsertEvent(await client.getEvent(id), null);
        event = await db.getEvent(id);
      } catch {
        /* not found */
      }
    }
    if (!event) return res.status(404).json({ error: 'event not found' });
    const tickets = (await db.allTickets()).filter((t) => t.eventId === id);
    return res.json({ event, tickets });
  }));

  // --- tickets ---
  app.get('/api/tickets', wrap(async (req, res) => {
    const owner = typeof req.query.owner === 'string' ? req.query.owner : '';
    if (!owner) return res.status(400).json({ error: 'owner is required' });
    return res.json({ tickets: await db.ticketsByOwner(owner) });
  }));

  // --- stats & activity ---
  app.get('/api/stats', wrap(async (_req, res) => {
    res.json(await computeStats(db));
  }));
  app.get('/api/activity', wrap(async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
    res.json({ activity: await db.recentActivity(limit) });
  }));

  // --- feedback ---
  app.post('/api/feedback', wrap(async (req, res) => {
    const body = req.body ?? {};
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (message.length === 0) return res.status(400).json({ error: 'message is required' });
    if (message.length > 2000) return res.status(400).json({ error: 'message too long' });
    await db.insertFeedback({
      wallet: typeof body.wallet === 'string' ? body.wallet : null,
      rating: typeof body.rating === 'number' ? body.rating : null,
      message,
      category: typeof body.category === 'string' ? body.category : null,
    });
    return res.status(201).json({ ok: true });
  }));
  app.get('/api/feedback/summary', wrap(async (_req, res) => {
    res.json(await db.feedbackSummary());
  }));

  // --- analytics ---
  app.post('/api/analytics/event', wrap(async (req, res) => {
    const body = req.body ?? {};
    if (typeof body.name !== 'string' || body.name.length === 0) {
      return res.status(400).json({ error: 'name is required' });
    }
    await db.insertAnalytics(body.name, typeof body.wallet === 'string' ? body.wallet : null, body.props ?? null);
    return res.status(201).json({ ok: true });
  }));
  app.get('/api/analytics/summary', wrap(async (_req, res) => {
    res.json(await db.analyticsSummary());
  }));

  // --- onboarding (collect user details like the Google Form, exportable to Excel/CSV) ---
  app.post('/api/onboard', wrap(async (req, res) => {
    const b = req.body ?? {};
    await db.insertOnboard({
      wallet: typeof b.wallet === 'string' ? b.wallet : null,
      email: typeof b.email === 'string' ? b.email : null,
      name: typeof b.name === 'string' ? b.name : null,
      rating: typeof b.rating === 'number' ? b.rating : null,
      note: typeof b.note === 'string' ? b.note : null,
    });
    return res.status(201).json({ ok: true });
  }));
  app.get('/api/onboard/summary', wrap(async (_req, res) => {
    const rows = await db.onboardRows();
    const avg =
      rows.filter((r) => r.rating != null).reduce((a, r) => a + (r.rating ?? 0), 0) /
      Math.max(1, rows.filter((r) => r.rating != null).length);
    res.json({ count: rows.length, averageRating: rows.some((r) => r.rating != null) ? avg : null, recent: rows.slice(0, 20) });
  }));
  app.get('/api/onboard/export.csv', wrap(async (_req, res) => {
    const rows = await db.onboardRows();
    const header = ['name', 'email', 'wallet', 'rating', 'note', 'submitted_at'];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [r.name, r.email, r.wallet, r.rating, r.note, new Date(r.createdAt).toISOString()]
          .map(csvEscape)
          .join(',')
      );
    }
    res.setHeader('content-type', 'text/csv; charset=utf-8');
    res.setHeader('content-disposition', 'attachment; filename="tessera-users.csv"');
    return res.send(lines.join('\n'));
  }));

  app.use((_req, res) => res.status(404).json({ error: 'not found' }));
  return app;
}
