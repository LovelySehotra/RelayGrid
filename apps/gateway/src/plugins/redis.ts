import Redis from 'ioredis';
import fp from 'fastify-plugin';
import { env } from '@relay/config';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

export const redisPlugin = fp(async (fastify) => {
  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  fastify.decorate('redis', redis);

  fastify.addHook('onClose', async () => {
    await redis.quit();
  });
});