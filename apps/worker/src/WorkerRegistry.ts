import { Worker, Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { sql } from '@relay/db';
import { env } from '@relay/config';
import { deliverJob } from './workers/delivery.js';

export class WorkerRegistry {
  private workers: Map<string, Worker> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;
  private redis: Redis;

  constructor() {
    this.redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }

  async start(): Promise<void> {
    // Query all distinct tenant IDs
    const client = sql();
    const tenants = await client`SELECT DISTINCT tenant_id FROM events` as any;

    for (const tenant of tenants) {
      await this.ensureWorker(tenant.tenant_id);
    }

    // Poll every 60s for new tenants
    this.pollInterval = setInterval(async () => {
      const newTenants = await client`SELECT DISTINCT tenant_id FROM events` as any;

      for (const tenant of newTenants) {
        await this.ensureWorker(tenant.tenant_id);
      }
    }, 60000);
  }

  async ensureWorker(tenantId: string): Promise<void> {
    if (this.workers.has(tenantId)) {
      return;
    }

    // Get tenant plan to determine concurrency
    const client = sql();
    const tenant = await client`SELECT plan FROM tenants WHERE id = ${tenantId} LIMIT 1` as any;

    if (tenant.length === 0) {
      return;
    }

    const planConcurrency: Record<string, number> = {
      free: 2,
      developer: 5,
      startup: 10,
      business: 20,
    };

    const concurrency = planConcurrency[tenant[0].plan] || 2;

    const worker = new Worker(
      `queue:${tenantId}`,
      async (job: Job) => deliverJob(job, this.redis),
      {
        connection: this.redis,
        concurrency,
      }
    );

    worker.on('failed', async (job, error) => {
      console.error(`Job ${job?.id} failed:`, error);

      if (job && job.attemptsMade >= (job.opts.attempts || 8)) {
        // Move to DLQ
        const dlq = new Queue('dlq', { connection: this.redis });
        await dlq.add('dead-letter', job.data);
        await dlq.close();

        // Update event status
        const client = sql();
        await client`UPDATE events SET status = 'dead' WHERE id = ${job.data.event_id}`;
      }
    });

    worker.on('error', (error) => {
      console.error('Worker error:', error);
    });

    this.workers.set(tenantId, worker);
    console.log(`✓ Worker started for tenant ${tenantId} (concurrency: ${concurrency})`);
  }

  async stop(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    for (const [tenantId, worker] of this.workers) {
      await worker.close();
      console.log(`✓ Worker stopped for tenant ${tenantId}`);
    }

    this.workers.clear();
    await this.redis.quit();
  }
}
