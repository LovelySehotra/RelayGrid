import fp from 'fastify-plugin';
import { ulid } from 'ulid';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Queue } from 'bullmq';
import { verifySignature } from '../lib/signatures.js';
import type { JobPayload, SchemaJobPayload } from '@relay/types';
import { env } from '@relay/config';
import { FastifyInstance } from 'fastify';
import { IngestRequest } from '../types/index.js';
const s3Client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

export const ingestRoute = fp(async (fastify) => {
  const app = fastify as FastifyInstance;
  app.post(
    '/:sourceSlug',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            sourceSlug: { type: 'string' },
          },
          required: ['sourceSlug'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const req = request as IngestRequest;
      const { sourceSlug } = req.params;
      const tenantId = req.tenant!.tenantId;
      const rawBody = req.rawBody;

      // Look up source
      const source = await app.sql`
        SELECT id, source_type, signing_secret
        FROM sources
        WHERE tenant_id = ${tenantId} AND slug = ${sourceSlug}
        LIMIT 1
      `;

      if (source.length === 0) {
        return reply.status(404).send({ error: 'source_not_found' });
      }

      const sourceData = source[0];

      // Verify signature
      const isValid = verifySignature(
        sourceData.source_type,
        rawBody,
        request.headers as Record<string, string>,
        sourceData.signing_secret
      );

      if (!isValid) {
        return reply.status(401).send({ error: 'invalid_signature' });
      }

      const eventId = ulid();
      const date = new Date().toISOString().split('T')[0];
      const s3Key = `${tenantId}/${date}/${eventId}.json`;

      // Upload to S3 (fire and forget)
      const s3Promise = s3Client.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: s3Key,
          Body: rawBody,
          ContentType: 'application/json',
        })
      );

      // Insert event
      await app.sql`
        INSERT INTO events (id, tenant_id, source_id, source_type, s3_key, status)
        VALUES (${eventId}, ${tenantId}, ${sourceData.id}, ${sourceData.source_type}, ${s3Key}, 'received')
      `;

      // Enqueue delivery job
      const queue = new Queue(`queue:${tenantId}`, {
        connection: app.redis as any,
      });

      const headersSubset: Record<string, string> = {};
      for (const [key, value] of Object.entries(request.headers)) {
        if (typeof value === 'string') {
          headersSubset[key] = value;
        }
      }

      const jobPayload: JobPayload = {
        event_id: eventId,
        tenant_id: tenantId,
        source_type: sourceData.source_type,
        s3_key: s3Key,
        headers: headersSubset,
      };

      await queue.add('deliver', jobPayload, {
        priority: 10,
        attempts: 8,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      });

      // Enqueue schema inference job (lower priority)
      const schemaPayload: SchemaJobPayload = {
        event_id: eventId,
        tenant_id: tenantId,
        source_type: sourceData.source_type,
        s3_key: s3Key,
      };

      await queue.add('schema-inference', schemaPayload, {
        priority: 20,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      await queue.close();

      // Update event status to queued (fire and forget)
      app.sql`UPDATE events SET status = 'queued' WHERE id = ${eventId}`;

      // Wait for S3 upload
      await s3Promise;

      request.log.info({ tenantId, eventId, sourceType: sourceData.source_type }, 'event ingested');

      return { id: eventId, status: 'queued' };
    }
  );
});
