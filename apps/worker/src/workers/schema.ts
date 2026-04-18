import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { sql } from '@relay/db';
import { env } from '@relay/config';
import type { SchemaJobPayload } from '@relay/types';

const s3Client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

class SchemaWorker {
  private worker: Worker | null = null;
  private redis: Redis;

  constructor() {
    this.redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }

  async run(): Promise<void> {
    this.worker = new Worker(
      'schema-inference',
      async (job: Job<SchemaJobPayload>) => this.process(job),
      {
        connection: this.redis,
        concurrency: 3,
      }
    );

    this.worker.on('error', (error) => {
      console.error('Schema worker error:', error);
    });

    console.log('✓ Schema worker started');
  }

  private async process(job: Job<SchemaJobPayload>): Promise<void> {
    const { event_id, tenant_id, source_type, s3_key } = job.data;

    // Fetch payload from S3
    const s3Response = await s3Client.send(
      new GetObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: s3_key,
      })
    );

    const payloadText = await s3Response.Body?.transformToString();

    if (!payloadText) {
      throw new Error('Empty payload from S3');
    }

    let payload: unknown;
    try {
      payload = JSON.parse(payloadText);
    } catch {
      // Not JSON, skip schema inference
      return;
    }

    // Infer JSON Schema
    const schema = this.inferSchema(payload);

    // Load current schema
    const current = await sql()`
      SELECT * FROM schema_registry
      WHERE tenant_id = ${tenant_id} AND source_type = ${source_type}
      ORDER BY version DESC
      LIMIT 1
    `;

    if (current.length === 0) {
      // Insert initial version
      await sql()`
        INSERT INTO schema_registry (tenant_id, source_type, version, json_schema)
        VALUES (${tenant_id}, ${source_type}, 1, ${JSON.stringify(schema)})
      `;
      return;
    }

    // Diff schemas
    const hasDrift = this.diffSchemas(current[0].json_schema, schema);

    if (hasDrift) {
      const newVersion = current[0].version + 1;
      await sql()`
        INSERT INTO schema_registry (tenant_id, source_type, version, json_schema)
        VALUES (${tenant_id}, ${source_type}, ${newVersion}, ${JSON.stringify(schema)})
      `;

      // Publish drift alert
      await this.redis.publish(
        `schema-drift:${tenant_id}`,
        JSON.stringify({
          tenant_id,
          source_type,
          old_version: current[0].version,
          new_version: newVersion,
        })
      );
    }
  }

  private inferSchema(value: unknown): unknown {
    if (value === null) {
      return { type: 'null' };
    }

    if (typeof value === 'string') {
      return { type: 'string' };
    }

    if (typeof value === 'number') {
      return { type: 'number' };
    }

    if (typeof value === 'boolean') {
      return { type: 'boolean' };
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return { type: 'array', items: {} };
      }
      return {
        type: 'array',
        items: this.inferSchema(value[0]),
      };
    }

    if (typeof value === 'object') {
      const properties: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        properties[key] = this.inferSchema(val);
      }
      return { type: 'object', properties };
    }

    return {};
  }

  private diffSchemas(old: unknown, newSchema: unknown): boolean {
    return JSON.stringify(old) !== JSON.stringify(newSchema);
  }

  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
    await this.redis.quit();
  }
}

export const schemaWorker = new SchemaWorker();
