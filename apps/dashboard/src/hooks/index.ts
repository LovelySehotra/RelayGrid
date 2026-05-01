import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useDemo } from '../lib/demo-context';
import { DEMO_METRICS, DEMO_EVENTS, DEMO_SOURCES, DEMO_DESTINATIONS, DEMO_ATTEMPTS } from '../lib/demo-data';
import type { EventFilters } from '../types';

export function useMetrics() {
  const { isDemo } = useDemo();
  return useQuery({
    queryKey: ['metrics'],
    queryFn: isDemo ? () => Promise.resolve(DEMO_METRICS) : api.getMetrics,
    refetchInterval: 30000,
    enabled: true,
  });
}

export function useEvents(filters: EventFilters = {}) {
  const { isDemo } = useDemo();
  return useQuery({
    queryKey: ['events', filters],
    queryFn: isDemo
      ? () => Promise.resolve({ data: DEMO_EVENTS, next_cursor: null })
      : () => api.getEvents(filters),
    refetchInterval: 30000,
  });
}

export function useEvent(id: string) {
  const { isDemo } = useDemo();
  return useQuery({
    queryKey: ['event', id],
    queryFn: isDemo
      ? () => Promise.resolve({
          event: DEMO_EVENTS.find(e => e.id === id) ?? DEMO_EVENTS[0],
          attempts: DEMO_ATTEMPTS[id] ?? DEMO_ATTEMPTS['evt_01HZ3M9W4F1W2E3R'],
        })
      : () => api.getEvent(id),
    enabled: !!id,
  });
}

export function useReplayEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.replayEvent(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['event', id] });
      qc.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useSources() {
  const { isDemo } = useDemo();
  return useQuery({
    queryKey: ['sources'],
    queryFn: isDemo ? () => Promise.resolve({ data: DEMO_SOURCES }) : api.getSources,
  });
}

export function useCreateSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createSource,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sources'] }),
  });
}

export function useDeleteSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteSource,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sources'] }),
  });
}

export function useDestinations() {
  const { isDemo } = useDemo();
  return useQuery({
    queryKey: ['destinations'],
    queryFn: isDemo ? () => Promise.resolve({ data: DEMO_DESTINATIONS }) : api.getDestinations,
  });
}

export function useCreateDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createDestination,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['destinations'] }),
  });
}

export function useDeleteDestination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteDestination,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['destinations'] }),
  });
}
