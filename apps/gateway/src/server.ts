import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { redisPlugin } from './plugins/redis.js';
import { postgresPlugin } from './plugins/postgres.js';
// import rateLimit from '@fastify/rate-limit';
// import { env } from '@relay/config';

export async function createApp() {
  const fastify = Fastify({
    // logger: {
    //   level: env.LOG_LEVEL,
    //   transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
    // },
  });

  await fastify.register(helmet);
  await fastify.register(cors, { origin: true });
  await fastify.register(redisPlugin);
  await fastify.register(postgresPlugin);
  // await fastify.register(rateLimit, {
  //   redis: fastify.redis,
  //   global: false,
  // });
  fastify.addHook('onRequest', async (request, reply) => {
    request.log.info({ method: request.method, url: request.url }, 'incoming request');
  });

  return fastify;
}
