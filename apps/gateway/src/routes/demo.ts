import { FastifyPluginAsync } from 'fastify';

export const demoRoute: FastifyPluginAsync = async (fastify) => {
  // GET /demo - Dev-only route to test API status and return tenant context
  fastify.get('/', async (request, reply) => {
    if (!request.tenant) {
      return reply.status(401).send({ error: 'unauthorized' });
    }

    return {
      status: 'success',
      message: 'Hello from dev-only demo API!',
      environment: 'development',
      tenant: request.tenant,
    };
  });
};
