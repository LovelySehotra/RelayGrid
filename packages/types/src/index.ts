export type SourceType = 'stripe' | 'github' | 'twilio' | 'generic';

export type TenantPlan = 'free' | 'developer' | 'startup' | 'business';

export type EventStatus = 'received' | 'queued' | 'delivered' | 'failed' | 'dead';

export interface Tenant {
  id: string;
  slug: string;
  plan: TenantPlan;
  created_at: Date;
}

export interface ApiKey {
  id: string;
  tenant_id: string;
  key_hash: string;
  label: string | null;
  revoked_at: Date | null;
  grace_period_until: Date | null;
  created_at: Date;
}

export interface Source {
  id: string;
  tenant_id: string;
  slug: string;
  source_type: SourceType;
  signing_secret: string;
  created_at: Date;
}

export interface Destination {
  id: string;
  tenant_id: string;
  url: string;
  label: string | null;
  timeout_ms: number;
  created_at: Date;
}

export interface WebhookEvent {
  id: string;
  tenant_id: string;
  source_id: string | null;
  source_type: SourceType;
  s3_key: string;
  status: EventStatus;
  received_at: Date;
  delivered_at: Date | null;
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
  attempted_at: Date;
}

export interface SchemaRegistryEntry {
  id: string;
  tenant_id: string;
  source_type: SourceType;
  version: number;
  json_schema: unknown;
  created_at: Date;
}

export interface DeadLetter {
  id: string;
  event_id: string;
  tenant_id: string;
  error: string | null;
  payload_s3_key: string | null;
  failed_at: Date;
}

export interface TenantContext {
  tenantId: string;
  slug: string;
  plan: TenantPlan;
  rateLimitRps: number;
}

export interface JobPayload {
  event_id: string;
  tenant_id: string;
  source_type: SourceType;
  s3_key: string;
  headers: Record<string, string>;
}

export interface SchemaJobPayload {
  event_id: string;
  tenant_id: string;
  source_type: SourceType;
  s3_key: string;
}

export interface DLQPayload extends JobPayload {
  error: string;
  attempts_made: number;
}
