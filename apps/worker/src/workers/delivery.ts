import { Job } from 'bullmq';
import Redis from 'ioredis';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { sql } from '@relay/db';
import { env } from '@relay/config';
import type { JobPayload } from '@relay/types';
import { checkCircuitBreaker, recordFailure, recordSuccess, CircuitOpenError } from '../lib/circuitBreaker.js';

const s3Client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

export async function deliverJob(job: Job<JobPayload>, redis: Redis): Promise<void> {
  const { event_id, tenant_id, s3_key } = job.data;

  // Fetch payload from S3
  const s3Response = await s3Client.send(
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: s3_key,
    })
  );

  const payload = await s3Response.Body?.transformToString();

  if (!payload) {
    throw new Error('Empty payload from S3');
  }

  // Load destinations from DB (cache in Redis 5min)
  const cacheKey = `destinations:${tenant_id}`;
  let destinations = await redis.get(cacheKey);

  if (!destinations) {
    const client = sql();
    const result = await client`
      SELECT * FROM destinations WHERE tenant_id = ${tenant_id}
    `;
    destinations = JSON.stringify(result);
    await redis.setex(cacheKey, 300, destinations);
  }

  const destList = JSON.parse(destinations);

  if (destList.length === 0) {
    console.log(`No destinations for tenant ${tenant_id}`);
    return;
  }

  // Deliver to each destination
  for (const dest of destList) {
    const startTime = Date.now();

    try {
      // Check circuit breaker
      await checkCircuitBreaker(redis, dest.id);

      const response = await fetch(dest.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Relay-Event-Id': event_id,
          'X-Webhook-Relay-Attempt': String(job.attemptsMade),
          'X-Webhook-Relay-Timestamp': String(Date.now()),
        },
        body: payload,
        signal: AbortSignal.timeout(dest.timeout_ms),
      });

      const latency = Date.now() - startTime;

      // Record delivery attempt
      const client = sql();
      await client`
        INSERT INTO delivery_attempts (event_id, destination_id, attempt_num, status_code, response_body, latency_ms, attempted_at)
        VALUES (${event_id}, ${dest.id}, ${job.attemptsMade + 1}, ${response.status}, ${await response.text()}, ${latency}, NOW())
      `;

      // Publish to Redis channel
      await redis.publish(
        `events:${tenant_id}`,
        JSON.stringify({
          event_id,
          status: response.ok ? 'delivered' : 'failed',
          status_code: response.status,
          latency_ms: latency,
          attempt: job.attemptsMade,
        })
      );

      if (!response.ok) {
        await recordFailure(redis, dest.id);
        throw new Error(`HTTP ${response.status}`);
      }

      await recordSuccess(redis, dest.id);
    } catch (error) {
      const latency = Date.now() - startTime;

      if (error instanceof CircuitOpenError) {
        // Circuit breaker is open, don't count as delivery attempt
        throw error;
      }

      // Record failed delivery attempt
      const client = sql();
      await client`
        INSERT INTO delivery_attempts (event_id, destination_id, attempt_num, status_code, error, latency_ms, attempted_at)
        VALUES (${event_id}, ${dest.id}, ${job.attemptsMade + 1}, NULL, ${error instanceof Error ? error.message : 'Unknown error'}, ${latency}, NOW())
      `;

      await recordFailure(redis, dest.id);
      throw error;
    }
  }

  // On final success, update event status
  const client = sql();
  await client`
    UPDATE events SET status = 'delivered', delivered_at = NOW() WHERE id = ${event_id}
  `;
}
