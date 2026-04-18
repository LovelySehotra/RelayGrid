import fp from 'fastify-plugin';
import { Queue } from 'bullmq';
import { withTenant } from '@relay/db';

export const eventsRoute = fp(async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const tenantId = request.tenant!.tenantId;
    const limit = (request.query as any).limit ? parseInt((request.query as any).limit) : 50;
    const cursor = (request.query as any).cursor;
    const status = (request.query as any).status;
    const sourceType = (request.query as any).source_type;

    let query = fastify.sql`
      SELECT id, tenant_id, source_type, s3_key, status, received_at, delivered_at
      FROM events
      WHERE tenant_id = ${tenantId}
    `;

    if (status) {
      query = fastify.sql`
        ${query} AND status = ${status}
      `;
    }

    if (sourceType) {
      query = fastify.sql`
        ${query} AND source_type = ${sourceType}
      `;
    }

    if (cursor) {
      query = fastify.sql`
        ${query} AND (received_at, id) < (${cursor.split(',')[0]}, ${cursor.split(',')[1]})
      `;
    }

    query = fastify.sql`
      ${query} ORDER BY received_at DESC, id DESC
      LIMIT ${limit}
    `;

    const events = await query;

    const nextCursor = events.length === limit
      ? `${events[events.length - 1].received_at.toISOString()},${events[events.length - 1].id}`
      : null;

    return { data: events, next_cursor: nextCursor };
  });

  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.tenant!.tenantId;
      const { id } = request.params;

      const event = await fastify.sql`
        SELECT * FROM events
        WHERE id = ${id} AND tenant_id = ${tenantId}
        LIMIT 1
      `;

      if (event.length === 0) {
        return reply.status(404).send({ error: 'event_not_found' });
      }

      const attempts = await fastify.sql`
        SELECT * FROM delivery_attempts
        WHERE event_id = ${id}
        ORDER BY attempted_at DESC
      `;

      return { event: event[0], attempts };
    }
  );

  fastify.post<{ Params: { id: string } }>(
    '/:id/replay',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.tenant!.tenantId;
      const { id } = request.params;

      const event = await fastify.sql`
        SELECT * FROM events
        WHERE id = ${id} AND tenant_id = ${tenantId}
        LIMIT 1
      `;

      if (event.length === 0) {
        return reply.status(404).send({ error: 'event_not_found' });
      }

      const eventData = event[0];

      const queue = new Queue(`queue:${tenantId}`, {
        connection: fastify.redis as any,
      });

      const jobPayload = {
        event_id: id,
        tenant_id: tenantId,
        source_type: eventData.source_type,
        s3_key: eventData.s3_key,
        headers: {},
      };

      await queue.add('deliver', jobPayload, {
        priority: 5, // Boosted priority for replay
        attempts: 8,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      });

      await queue.close();

      await fastify.sql`
        UPDATE events SET status = 'queued' WHERE id = ${id}
      `;

      return { queued: true };
    }
  );

  fastify.get('/sources', async (request, reply) => {
    const tenantId = request.tenant!.tenantId;

    const sources = await fastify.sql`
      SELECT * FROM sources
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `;

    return { data: sources };
  });

  fastify.post(
    '/sources',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
            source_type: { type: 'string', enum: ['stripe', 'github', 'twilio', 'generic'] },
            signing_secret: { type: 'string' },
          },
          required: ['slug', 'source_type', 'signing_secret'],
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.tenant!.tenantId;
      const body = request.body as any;

      const result = await fastify.sql`
        INSERT INTO sources (tenant_id, slug, source_type, signing_secret)
        VALUES (${tenantId}, ${body.slug}, ${body.source_type}, ${body.signing_secret})
        RETURNING *
      `;

      return { data: result[0] };
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    '/sources/:id',
    async (request, reply) => {
      const tenantId = request.tenant!.tenantId;
      const { id } = request.params;

      await fastify.sql`
        DELETE FROM sources
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `;

      return { deleted: true };
    }
  );

  fastify.get('/destinations', async (request, reply) => {
    const tenantId = request.tenant!.tenantId;

    const destinations = await fastify.sql`
      SELECT * FROM destinations
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `;

    return { data: destinations };
  });

  fastify.post(
    '/destinations',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri' },
            label: { type: 'string' },
            timeout_ms: { type: 'number' },
          },
          required: ['url'],
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.tenant!.tenantId;
      const body = request.body as any;

      const result = await fastify.sql`
        INSERT INTO destinations (tenant_id, url, label, timeout_ms)
        VALUES (${tenantId}, ${body.url}, ${body.label || null}, ${body.timeout_ms || 10000})
        RETURNING *
      `;

      return { data: result[0] };
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    '/destinations/:id',
    async (request, reply) => {
      const tenantId = request.tenant!.tenantId;
      const { id } = request.params;

      await fastify.sql`
        DELETE FROM destinations
        WHERE id = ${id} AND tenant_id = ${tenantId}
      `;

      return { deleted: true };
    }
  );

  fastify.get('/metrics/summary', async (request, reply) => {
    const tenantId = request.tenant!.tenantId;

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [totalEvents, deliveredEvents, failedEvents] = await Promise.all([
      fastify.sql`
        SELECT COUNT(*) as count FROM events
        WHERE tenant_id = ${tenantId} AND received_at > ${dayAgo}
      `,
      fastify.sql`
        SELECT COUNT(*) as count FROM events
        WHERE tenant_id = ${tenantId} AND status = 'delivered' AND received_at > ${dayAgo}
      `,
      fastify.sql`
        SELECT COUNT(*) as count FROM events
        WHERE tenant_id = ${tenantId} AND status = 'failed' AND received_at > ${dayAgo}
      `,
    ]);

    const queueDepth = await fastify.redis.llen(`queue:${tenantId}`);
    const dlqDepth = await fastify.redis.llen('dlq');

    const avgLatency = await fastify.sql`
      SELECT AVG(latency_ms) as avg FROM delivery_attempts
      WHERE event_id IN (
        SELECT id FROM events WHERE tenant_id = ${tenantId}
      ) AND attempted_at > ${dayAgo}
    `;

    return {
      total_events_24h: parseInt(totalEvents[0].count),
      delivered_24h: parseInt(deliveredEvents[0].count),
      failed_24h: parseInt(failedEvents[0].count),
      queue_depth: queueDepth,
      dlq_depth: dlqDepth,
      avg_latency_ms: avgLatency[0].avg ? Math.round(avgLatency[0].avg) : 0,
    };
  });
});
