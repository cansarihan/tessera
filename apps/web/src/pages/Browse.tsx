import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarX, Compass, Search } from 'lucide-react';
import { EventStatus } from '@tessera/sdk';
import { useEvents } from '../lib/queries';
import { PageHeader } from '../components/layout/PageHeader';
import { EventCard } from '../components/event/EventCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { cn } from '../lib/cn';

type Filter = 'onsale' | 'all';

export function Browse() {
  const { data: events, isLoading, isError } = useEvents();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('onsale');

  const results = useMemo(() => {
    let list = events ?? [];
    if (filter === 'onsale') {
      list = list.filter((e) => e.status === EventStatus.Active && e.tiers.some((t) => t.sold < t.supply));
    }
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((e) => e.name.toLowerCase().includes(q));
    return list;
  }, [events, filter, query]);

  return (
    <div>
      <PageHeader
        title="Browse events"
        subtitle="Buy a ticket and it mints straight to your wallet as a unique NFT."
        action={
          <Link to="/app/organize">
            <Button variant="outline" size="sm">
              Create an event
            </Button>
          </Link>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            className="pl-9"
            placeholder="Search events…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1 rounded-full border border-white/10 p-1">
          {(['onsale', 'all'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition',
                filter === f ? 'bg-white/10 text-fg' : 'text-fg-muted hover:text-fg'
              )}
            >
              {f === 'onsale' ? 'On sale' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-60 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState icon={<CalendarX />} title="Couldn’t load events" description="The network may be busy. Try again in a moment." />
      ) : results.length === 0 ? (
        <EmptyState
          icon={<Compass />}
          title={query ? 'No matching events' : 'No events on sale yet'}
          description={query ? 'Try a different search.' : 'Be the first — create an event and start selling tickets.'}
          action={
            !query && (
              <Link to="/app/organize">
                <Button>Create an event</Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
