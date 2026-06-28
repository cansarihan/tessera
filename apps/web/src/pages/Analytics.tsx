import { Activity, BadgeCheck, CalendarDays, Coins, Star, Ticket, Users } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useEvents, useActivity, useFeedbackSummary, useStats } from '../lib/queries';
import { formatToken, relativeTime, shortAddress } from '../lib/format';
import { XLM } from '../lib/config';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { cn } from '../lib/cn';

const ACTIVITY_LABELS: Record<string, string> = {
  evt_new: 'Event created',
  bought: 'Ticket bought',
  listed: 'Listed for resale',
  resold: 'Resold',
  transfer: 'Transferred',
  checkin: 'Checked in',
};

export function Analytics() {
  const { data: stats, isLoading } = useStats();
  const { data: events } = useEvents();
  const { data: activity } = useActivity(20);
  const { data: feedback } = useFeedbackSummary();

  const chartData = (events ?? [])
    .map((e) => ({ name: e.name.length > 14 ? `${e.name.slice(0, 14)}…` : e.name, sold: e.tiers.reduce((a, t) => a + t.sold, 0) }))
    .filter((d) => d.sold > 0)
    .slice(0, 8);

  const checkInRate = stats && stats.ticketsSold > 0 ? Math.round((stats.checkedIn / stats.ticketsSold) * 100) : 0;

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Live, on-chain usage across Tessera — sales, attendance and feedback." />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Events" value={stats?.totalEvents ?? 0} icon={<CalendarDays />} />
          <StatCard label="Tickets sold" value={stats?.ticketsSold ?? 0} icon={<Ticket />} />
          <StatCard label="Checked in" value={stats?.checkedIn ?? 0} sub={`${checkInRate}% rate`} icon={<BadgeCheck />} />
          <StatCard label="Attendees" value={stats?.uniqueBuyers ?? 0} icon={<Users />} />
          <StatCard label="Organizers" value={stats?.organizers ?? 0} icon={<Users />} />
          <StatCard label="Revenue" value={`${formatToken(BigInt(stats?.revenue ?? '0'), XLM.decimals, 1)}`} sub={XLM.code} icon={<Coins />} />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="font-display text-lg text-fg">Tickets sold per event</h2>
          <div className="mt-4 h-64">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-fg-subtle">No sales yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#5e5890" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#5e5890" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    contentStyle={{ background: '#110f22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#eceaff' }}
                  />
                  <Bar dataKey="sold" fill="#9b5cff" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-fg">User feedback</h2>
            {feedback && feedback.averageRating != null && (
              <span className="inline-flex items-center gap-1 text-warning">
                <Star className="size-4 fill-warning" />
                <span className="tnum text-fg">{feedback.averageRating.toFixed(1)}</span>
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-fg-muted">{feedback?.count ?? 0} responses collected</p>
          <div className="mt-4 space-y-2">
            {(feedback?.recent ?? []).slice(0, 5).map((f) => (
              <div key={f.id} className="rounded-xl border border-white/8 p-3">
                <div className="flex items-center justify-between text-xs text-fg-subtle">
                  <span className="tnum">{f.wallet ? shortAddress(f.wallet) : 'anon'}</span>
                  <span>{relativeTime(Math.floor(f.createdAt / 1000))}</span>
                </div>
                <p className="mt-1 text-sm text-fg">{f.message}</p>
              </div>
            ))}
            {(feedback?.recent ?? []).length === 0 && <p className="text-sm text-fg-subtle">No feedback yet.</p>}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="flex items-center gap-2 font-display text-lg text-fg">
          <Activity className="size-5 text-holo-violet" /> Recent on-chain activity
        </h2>
        <div className="mt-4 divide-y divide-white/6">
          {(activity?.activity ?? []).length === 0 ? (
            <p className="py-4 text-sm text-fg-subtle">No activity indexed yet.</p>
          ) : (
            (activity?.activity ?? []).map((a, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                <span className={cn('font-medium', a.type === 'checkin' ? 'text-valid' : 'text-fg')}>
                  {ACTIVITY_LABELS[a.type] ?? a.type}
                  {a.refId !== null && <span className="ml-2 text-fg-subtle tnum">#{a.refId}</span>}
                </span>
                <span className="text-fg-subtle">{relativeTime(Math.floor(a.createdAt / 1000))}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
