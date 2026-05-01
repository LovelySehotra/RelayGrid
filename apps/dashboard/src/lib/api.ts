import type { MetricsSummary, WebhookEvent, DeliveryAttempt, Source, Destination, EventsResponse } from '../types';

const BASE = '/api';

function getKey(): string {
  return localStorage.getItem('relay_api_key') || '';
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': getKey(),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getMetrics: () => request<MetricsSummary>('/events/metrics/summary'),

  getEvents: (params: { limit?: number; cursor?: string; status?: string; source_type?: string }) => {
    const q = new URLSearchParams();
    if (params.limit) q.set('limit', String(params.limit));
    if (params.cursor) q.set('cursor', params.cursor);
    if (params.status) q.set('status', params.status);
    if (params.source_type) q.set('source_type', params.source_type);
    return request<EventsResponse>(`/events?${q}`);
  },

  getEvent: (id: string) =>
    request<{ event: WebhookEvent; attempts: DeliveryAttempt[] }>(`/events/${id}`),

  replayEvent: (id: string) =>
    request<{ queued: boolean }>(`/events/${id}/replay`, { method: 'POST' }),

  getSources: () => request<{ data: Source[] }>('/events/sources'),

  createSource: (body: { slug: string; source_type: string; signing_secret: string }) =>
    request<{ data: Source }>('/events/sources', { method: 'POST', body: JSON.stringify(body) }),

  deleteSource: (id: string) =>
    request<{ deleted: boolean }>(`/events/sources/${id}`, { method: 'DELETE' }),

  getDestinations: () => request<{ data: Destination[] }>('/events/destinations'),

  createDestination: (body: { url: string; label?: string; timeout_ms?: number }) =>
    request<{ data: Destination }>('/events/destinations', { method: 'POST', body: JSON.stringify(body) }),

  deleteDestination: (id: string) =>
    request<{ deleted: boolean }>(`/events/destinations/${id}`, { method: 'DELETE' }),
};
