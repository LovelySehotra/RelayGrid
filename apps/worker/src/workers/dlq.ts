import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { sql } from '@relay/db';
import { env } from '@relay/config';
import type { DLQPayload } from '@relay/types';

class DLQWorker {
  private worker: Worker | null = null;
  private redis: Redis;

  constructor() {
    this.redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }

  async run(): Promise<void> {
    this.worker = new Worker(
      'dlq',
      async (job: Job<DLQPayload>) => this.process(job),
      {
        connection: this.redis,
        concurrency: 1,
      }
    );

    this.worker.on('error', (error) => {
      console.error('DLQ worker error:', error);
    });

    console.log('✓ DLQ worker started');
  }

  private async process(job: Job<DLQPayload>): Promise<void> {
    const { event_id, tenant_id, error, attempts_made } = job.data;

    console.error(`Dead letter: event_id=${event_id}, tenant_id=${tenant_id}, error=${error}, attempts=${attempts_made}`);

    // Insert into dead_letters table
    await (sql as any)`INSERT INTO dead_letters (event_id, tenant_id, error, payload_s3_key, failed_at) VALUES (${event_id}, ${tenant_id}, ${error}, ${job.data.s3_key}, NOW())`;

    // Publish to Redis channel
    await this.redis.publish(
      `dlq:${tenant_id}`,
      JSON.stringify({
        event_id,
        tenant_id,
        error,
        attempts_made,
      })
    );
  }

  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
    await this.redis.quit();
  }
}

export const dlqWorker = new DLQWorker();
