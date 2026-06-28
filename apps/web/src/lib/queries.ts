import { useQuery } from '@tanstack/react-query';
import { tessera } from './client';
import { api } from './api';

/** Events are read straight from the contract so newly-created ones appear immediately. */
export function useEvents() {
  return useQuery({ queryKey: ['events'], queryFn: () => tessera.listEvents(), refetchInterval: 20_000 });
}

export function useEvent(id: number | null) {
  return useQuery({
    queryKey: ['event', id],
    enabled: id !== null && id >= 0,
    refetchInterval: 15_000,
    queryFn: async () => {
      const [event, tickets] = await Promise.all([
        tessera.getEvent(id as number),
        tessera.listTicketsByEvent(id as number),
      ]);
      return { event, tickets };
    },
  });
}

export function useMyTickets(address: string | null) {
  return useQuery({
    queryKey: ['my-tickets', address],
    enabled: !!address,
    refetchInterval: 20_000,
    queryFn: () => tessera.listTicketsByOwner(address as string),
  });
}

export function useMyBadges(address: string | null) {
  return useQuery({
    queryKey: ['my-badges', address],
    enabled: !!address,
    refetchInterval: 30_000,
    queryFn: () => tessera.listBadgesByOwner(address as string),
  });
}

/** All resale listings across every event (price-capped secondary market). */
export function useMarket() {
  return useQuery({
    queryKey: ['market'],
    refetchInterval: 20_000,
    queryFn: async () => {
      const events = await tessera.listEvents();
      const groups = await Promise.all(
        events.map(async (event) => {
          const tickets = await tessera.listTicketsByEvent(event.id);
          return tickets.filter((t) => t.listPrice > 0n && !t.used).map((ticket) => ({ ticket, event }));
        })
      );
      return groups.flat();
    },
  });
}

export function useStats() {
  return useQuery({ queryKey: ['stats'], queryFn: () => api.stats(), refetchInterval: 15_000, retry: 1 });
}

export function useActivity(limit = 30) {
  return useQuery({
    queryKey: ['activity', limit],
    queryFn: () => api.activity(limit),
    refetchInterval: 15_000,
    retry: 1,
  });
}

export function useAnalyticsSummary() {
  return useQuery({ queryKey: ['analytics-summary'], queryFn: () => api.analyticsSummary(), retry: 1 });
}

export function useFeedbackSummary() {
  return useQuery({ queryKey: ['feedback-summary'], queryFn: () => api.feedbackSummary(), retry: 1 });
}
