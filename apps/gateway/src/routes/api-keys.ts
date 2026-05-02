import { FastifyPluginAsync } from 'fastify';
import { createHash, randomBytes } from 'crypto';

export const apiKeysRoute: FastifyPluginAsync = async (fastify) => {
  // GET /api-keys - List API keys for the current tenant
  fastify.get('/', async (request, reply) => {
    const tenantId = request.tenant?.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: 'unauthorized' });
    }

    const result = await fastify.sql`
      SELECT id, revoked_at, grace_period_until, created_at
      FROM api_keys
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `;

    return reply.send({ data: result });
  });

  // POST /api-keys - Generate a new API key
  fastify.post('/', async (request, reply) => {
    const tenantId = request.tenant?.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: 'unauthorized' });
    }

    // Generate a secure random token
    const token = randomBytes(24).toString('hex');
    const apiKey = `relay_live_${token}`;

    // Hash the token
    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    // Store in the database
    const result = await fastify.sql`
      INSERT INTO api_keys (tenant_id, key_hash)
      VALUES (${tenantId}, ${keyHash})
      RETURNING id, created_at
    `;

    // Only return the actual API key once!
    return reply.send({
      id: result[0].id,
      apiKey: apiKey,
      created_at: result[0].created_at,
    });
  });
};
