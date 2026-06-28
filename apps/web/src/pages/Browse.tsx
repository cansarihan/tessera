import { CalendarX, Compass } from 'lucide-react';
import { EventStatus } from '@tessera/sdk';
import { useEvents } from '../lib/queries';
import { PageHeader } from '../components/layout/PageHeader';
import { EventCard } from '../components/event/EventCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function Browse() {
  const { data: events, isLoading, isError } = useEvents();
  const live = (events ?? []).filter((e) => e.status === EventStatus.Active);

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

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-60 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState icon={<CalendarX />} title="Couldn’t load events" description="The network may be busy. Try again in a moment." />
      ) : live.length === 0 ? (
        <EmptyState
          icon={<Compass />}
          title="No events on sale yet"
          description="Be the first — create an event and start selling tickets."
          action={
            <Link to="/app/organize">
              <Button>Create an event</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {live.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
