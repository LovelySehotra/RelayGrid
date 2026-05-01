export type SourceType = 'stripe' | 'github' | 'twilio' | 'generic';
export type EventStatus = 'received' | 'queued' | 'delivered' | 'failed' | 'dead';
export type TenantPlan = 'free' | 'developer' | 'startup' | 'business';

export interface WebhookEvent {
  id: string;
  tenant_id: string;
  source_id: string | null;
  source_type: SourceType;
  s3_key: string;
  status: EventStatus;
  received_at: string;
  delivered_at: string | null;
}

export interface DeliveryAttempt {
  id: string;
  event_id: string;
  destination_id: string | null;
  attempt_num: number;
  status_code: number | null;
  response_body: string | null;
  latency_ms: number | null;
  error: string | null;
  attempted_at: string;
}

export interface Source {
  id: string;
  tenant_id: string;
  slug: string;
  source_type: SourceType;
  signing_secret: string;
  created_at: string;
}

export interface Destination {
  id: string;
  tenant_id: string;
  url: string;
  label: string | null;
  timeout_ms: number;
  created_at: string;
}

export interface MetricsSummary {
  total_events_24h: number;
  delivered_24h: number;
  failed_24h: number;
  queue_depth: number;
  dlq_depth: number;
  avg_latency_ms: number;
}

export interface EventsResponse {
  data: WebhookEvent[];
  next_cursor: string | null;
}

export interface EventFilters {
  status?: EventStatus | '';
  source_type?: SourceType | '';
  cursor?: string;
  limit?: number;
}
