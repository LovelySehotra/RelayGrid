import fp from 'fastify-plugin';
import promClient from 'prom-client';

const register = new promClient.Registry();

promClient.collectDefaultMetrics({ register });

const webhookIngestTotal = new promClient.Counter({
  name: 'webhook_ingest_total',
  help: 'Total number of webhooks ingested',
  labelNames: ['source_type', 'tenant_plan'],
  registers: [register],
});

const webhookDeliveryDuration = new promClient.Histogram({
  name: 'webhook_delivery_duration_ms',
  help: 'Duration of webhook delivery attempts in milliseconds',
  labelNames: ['status_code'],
  buckets: [50, 100, 200, 500, 1000, 2000, 5000, 10000],
  registers: [register],
});

const webhookQueueDepth = new promClient.Gauge({
  name: 'webhook_queue_depth',
  help: 'Current queue depth per tenant',
  labelNames: ['tenant_id'],
  registers: [register],
});

const webhookDlqDepth = new promClient.Gauge({
  name: 'webhook_dlq_depth',
  help: 'Current dead letter queue depth',
  registers: [register],
});

export { webhookIngestTotal, webhookDeliveryDuration, webhookQueueDepth, webhookDlqDepth };

export const healthRoute = fp(async (fastify) => {
  const startTime = Date.now();

  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      version: '1.0.0',
    };
  });

  fastify.get('/metrics', async (request, reply) => {
    reply.type('text/plain');
    return register.metrics();
  });
});
