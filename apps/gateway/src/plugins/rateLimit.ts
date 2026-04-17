import fp from 'fastify-plugin';

export const rateLimitPlugin = fp(async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    if (!request.tenant) return;

    const tenantId = request.tenant.tenantId;
    const key = `rl:${tenantId}`;
    const now = Date.now();
    const windowMs = 1000;

    const pipeline = fastify.redis.pipeline();
    pipeline.zremrangebyscore(key, 0, now - windowMs);
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    pipeline.expire(key, 2);
    pipeline.zcard(key);

    const results = await pipeline.exec();
    if (!results) return;

    const count = results[3][1] as number;
    const limit = request.tenant.rateLimitRps;

    if (count > limit) {
      reply.header('Retry-After', '1');
      return reply.status(429).send({ error: 'rate_limit_exceeded' });
    }
  });
});
