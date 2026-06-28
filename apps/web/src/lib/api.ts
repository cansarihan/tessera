import { API_URL } from './config';

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
export interface ProtocolStats {
  totalEvents: number;
  activeEvents: number;
  ticketsSold: number;
  checkedIn: number;
  uniqueBuyers: number;
  organizers: number;
  revenue: string;
}
export interface FeedbackSummary {
  count: number;
  averageRating: number | null;
  recent: Array<{
    id: number;
    wallet: string | null;
    rating: number | null;
    message: string;
    category: string | null;
    createdAt: number;
  }>;
}
export interface AnalyticsSummary {
  totalEvents: number;
  uniqueWallets: number;
  byName: Array<{ name: string; count: number }>;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  stats: () => http<ProtocolStats>('/api/stats'),
  activity: (limit = 50) => http<{ activity: ApiActivity[] }>(`/api/activity?limit=${limit}`),
  feedback: (body: { wallet?: string | null; rating?: number | null; message: string; category?: string }) =>
    http<{ ok: true }>('/api/feedback', { method: 'POST', body: JSON.stringify(body) }),
  feedbackSummary: () => http<FeedbackSummary>('/api/feedback/summary'),
  analyticsSummary: () => http<AnalyticsSummary>('/api/analytics/summary'),
  onboard: (body: { wallet?: string | null; email?: string; name?: string; rating?: number; note?: string }) =>
    http<{ ok: true }>('/api/onboard', { method: 'POST', body: JSON.stringify(body) }),
  onboardSummary: () => http<{ count: number; averageRating: number | null }>('/api/onboard/summary'),
  track: (name: string, wallet: string | null, props?: Record<string, unknown>) =>
    http('/api/analytics/event', {
      method: 'POST',
      body: JSON.stringify({ name, wallet, props: props ?? null }),
    }).catch(() => {
      /* best-effort */
    }),
};
