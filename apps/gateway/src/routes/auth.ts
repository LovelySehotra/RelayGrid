import { FastifyPluginAsync } from 'fastify';

export const authRoute: FastifyPluginAsync = async (fastify) => {
  // GET /auth/me - Verify current API key and return tenant context
  fastify.get('/me', async (request, reply) => {
    if (!request.tenant) {
      return reply.status(401).send({ error: 'unauthorized' });
    }

    return {
      authenticated: true,
      tenant: request.tenant,
    };
  });
};
