import fp from 'fastify-plugin';
import { createHash } from 'crypto';
import type { TenantContext } from '@relay/types';

declare module 'fastify' {
  interface FastifyRequest {
    tenant?: TenantContext;
  }
}

export const authPlugin = fp(async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.url === '/health' || request.url === '/metrics') {
      return;
    }

    const apiKey = request.headers['x-api-key'] as string;
    console.log("api key here :", apiKey);
    if (!apiKey) {
      return reply.status(401).send({ error: 'invalid_key' });
    }

    const keyHash = createHash('sha256').update(apiKey).digest('hex');
    const cacheKey = `auth:${keyHash}`;

    const cached = await fastify.redis.get(cacheKey);
    if (cached) {
      request.tenant = JSON.parse(cached);
      return;
    }

    const result = await fastify.sql`
      SELECT 
        t.id, t.slug, t.plan,
        ak.revoked_at, ak.grace_period_until
      FROM api_keys ak
      JOIN tenants t ON t.id = ak.tenant_id
      WHERE ak.key_hash = ${keyHash}
      LIMIT 1
    `;

    if (result.length === 0) {
      return reply.status(401).send({ error: 'invalid_key' });
    }

    const row = result[0];
    if (row.revoked_at && new Date(row.revoked_at) < new Date()) {
      return reply.status(401).send({ error: 'invalid_key' });
    }

    const planConcurrency: Record<string, number> = {
      free: 2,
      developer: 5,
      startup: 10,
      business: 20,
    };

    const tenantContext: TenantContext = {
      tenantId: row.id,
      slug: row.slug,
      plan: row.plan,
      rateLimitRps: planConcurrency[row.plan] || 2,
    };

    await fastify.redis.setex(cacheKey, 60, JSON.stringify(tenantContext));
    request.tenant = tenantContext;
  });
});
