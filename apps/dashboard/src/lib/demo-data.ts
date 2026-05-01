import type { MetricsSummary, WebhookEvent, DeliveryAttempt, Source, Destination } from '../types';

const now = new Date();
const h = (hrs: number) => new Date(now.getTime() - hrs * 3600000).toISOString();

export const DEMO_METRICS: MetricsSummary = {
  total_events_24h: 1284092,
  delivered_24h: 1260858,
  failed_24h: 23234,
  queue_depth: 0,
  dlq_depth: 3,
  avg_latency_ms: 142,
};

const TENANT = 'demo-tenant-id';

export const DEMO_EVENTS: WebhookEvent[] = [
  { id: 'evt_01HZ3M9X2K8L5P0Q', tenant_id: TENANT, source_id: 'src_stripe', source_type: 'stripe', s3_key: `${TENANT}/2024-10-24/evt_01HZ3M9X2K8L5P0Q.json`, status: 'delivered', received_at: h(0.3), delivered_at: h(0.28) },
  { id: 'evt_01HZ3M9Z8B7X6W5V', tenant_id: TENANT, source_id: 'src_github', source_type: 'github', s3_key: `${TENANT}/2024-10-24/evt_01HZ3M9Z8B7X6W5V.json`, status: 'delivered', received_at: h(0.5), delivered_at: h(0.48) },
  { id: 'evt_01HZ3M9W4F1W2E3R', tenant_id: TENANT, source_id: 'src_twilio', source_type: 'twilio', s3_key: `${TENANT}/2024-10-24/evt_01HZ3M9W4F1W2E3R.json`, status: 'failed', received_at: h(1), delivered_at: null },
  { id: 'evt_01HZ3M9P0S8O7L6Y', tenant_id: TENANT, source_id: 'src_generic', source_type: 'generic', s3_key: `${TENANT}/2024-10-24/evt_01HZ3M9P0S8O7L6Y.json`, status: 'queued', received_at: h(1.2), delivered_at: null },
  { id: 'evt_01HZ3M8A3C2D4E5F', tenant_id: TENANT, source_id: 'src_stripe', source_type: 'stripe', s3_key: `${TENANT}/2024-10-24/evt_01HZ3M8A3C2D4E5F.json`, status: 'delivered', received_at: h(2), delivered_at: h(1.98) },
  { id: 'evt_01HZ3M7B4D3E5F6G', tenant_id: TENANT, source_id: 'src_github', source_type: 'github', s3_key: `${TENANT}/2024-10-24/evt_01HZ3M7B4D3E5F6G.json`, status: 'dead', received_at: h(3), delivered_at: null },
  { id: 'evt_01HZ3M6C5E4F6G7H', tenant_id: TENANT, source_id: 'src_stripe', source_type: 'stripe', s3_key: `${TENANT}/2024-10-24/evt_01HZ3M6C5E4F6G7H.json`, status: 'delivered', received_at: h(4), delivered_at: h(3.98) },
  { id: 'evt_01HZ3M5D6F5G7H8I', tenant_id: TENANT, source_id: 'src_twilio', source_type: 'twilio', s3_key: `${TENANT}/2024-10-24/evt_01HZ3M5D6F5G7H8I.json`, status: 'received', received_at: h(5), delivered_at: null },
  { id: 'evt_01HZ3M4E7G6H8I9J', tenant_id: TENANT, source_id: 'src_generic', source_type: 'generic', s3_key: `${TENANT}/2024-10-24/evt_01HZ3M4E7G6H8I9J.json`, status: 'failed', received_at: h(6), delivered_at: null },
  { id: 'evt_01HZ3M3F8H7I9J0K', tenant_id: TENANT, source_id: 'src_stripe', source_type: 'stripe', s3_key: `${TENANT}/2024-10-24/evt_01HZ3M3F8H7I9J0K.json`, status: 'delivered', received_at: h(7), delivered_at: h(6.98) },
];

export const DEMO_ATTEMPTS: Record<string, DeliveryAttempt[]> = {
  'evt_01HZ3M9W4F1W2E3R': [
    { id: 'att_1', event_id: 'evt_01HZ3M9W4F1W2E3R', destination_id: 'dst_1', attempt_num: 1, status_code: 408, response_body: null, latency_ms: 5000, error: 'TIMEOUT', attempted_at: h(1.05) },
    { id: 'att_2', event_id: 'evt_01HZ3M9W4F1W2E3R', destination_id: 'dst_1', attempt_num: 2, status_code: 502, response_body: 'Bad Gateway', latency_ms: 1240, error: null, attempted_at: h(1.02) },
    { id: 'att_3', event_id: 'evt_01HZ3M9W4F1W2E3R', destination_id: 'dst_1', attempt_num: 3, status_code: 200, response_body: '{"ok":true}', latency_ms: 42, error: null, attempted_at: h(1) },
  ],
  'evt_01HZ3M9X2K8L5P0Q': [
    { id: 'att_s1', event_id: 'evt_01HZ3M9X2K8L5P0Q', destination_id: 'dst_2', attempt_num: 1, status_code: 200, response_body: '{"accepted":true}', latency_ms: 42, error: null, attempted_at: h(0.28) },
  ],
};

export const DEMO_SOURCES: Source[] = [
  { id: 'src_stripe', tenant_id: TENANT, slug: 'stripe-webhooks', source_type: 'stripe', signing_secret: 'whsec_demo_stripe_key_xxxxxxxx', created_at: h(720) },
  { id: 'src_github', tenant_id: TENANT, slug: 'github-ops', source_type: 'github', signing_secret: 'ghub_demo_secret_xxxxxxxx', created_at: h(480) },
  { id: 'src_twilio', tenant_id: TENANT, slug: 'twilio-sms', source_type: 'twilio', signing_secret: 'twilio_demo_secret_xxxxxxxx', created_at: h(240) },
  { id: 'src_generic', tenant_id: TENANT, slug: 'custom-ingest', source_type: 'generic', signing_secret: 'generic_demo_secret_xxxxxxxx', created_at: h(100) },
];

export const DEMO_DESTINATIONS: Destination[] = [
  { id: 'dst_1', tenant_id: TENANT, url: 'https://internal-api.example.com/webhooks', label: 'Internal_API', timeout_ms: 10000, created_at: h(720) },
  { id: 'dst_2', tenant_id: TENANT, url: 'https://hooks.slack.com/services/T00/B00/xxx', label: 'Slack_Notify', timeout_ms: 5000, created_at: h(480) },
  { id: 'dst_3', tenant_id: TENANT, url: 'https://audit.security.example.com/ingest', label: 'Security_Audit', timeout_ms: 15000, created_at: h(240) },
  { id: 'dst_4', tenant_id: TENANT, url: 's3://datalake.example.com/webhooks', label: 'S3_Data_Lake', timeout_ms: 30000, created_at: h(100) },
];

export const DEMO_CHART_DATA = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, '0')}:00`,
  success: Math.floor(Math.random() * 8000 + 1000),
  failed: Math.floor(Math.random() * 400 + 50),
}));

export const DEMO_PAYLOAD = {
  object: 'event',
  type: 'order.created',
  data: {
    order_id: 'ord_5521990',
    customer: { id: 'cus_8829', email: 'dev.ops@example.com', tier: 'enterprise' },
    items: [{ sku: 'RF-99-BLU', quantity: 1, price: 1299.00 }],
    metadata: { source_region: 'us-east-1', trace_id: 'b4c3d2e1-a0b1-c2d3-e4f5-a6b7c8d9e0f1' },
  },
  livemode: true,
  created_at: 1698157921,
};
