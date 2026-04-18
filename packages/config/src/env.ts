import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (go up 3 levels from packages/config/src)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL'),
  S3_ENDPOINT: z.string().url('S3_ENDPOINT must be a valid URL'),
  S3_BUCKET: z.string().min(1, 'S3_BUCKET is required'),
  S3_ACCESS_KEY: z.string().min(1, 'S3_ACCESS_KEY is required'),
  S3_SECRET_KEY: z.string().min(1, 'S3_SECRET_KEY is required'),
  S3_REGION: z.string().min(1, 'S3_REGION is required'),
  PORT: z.string().transform(Number).default(3000).pipe(
    z.number().int().positive().max(65535)
  ),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;
console.log(process.env.DATABASE_URL);
function parseEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .filter(e => e.code === 'invalid_type')
        .map(e => e.path.join('.'));
      console.error('❌ Invalid environment variables:');
      console.error(JSON.stringify(error.issues, null, 2));
      console.error('\nMissing or invalid variables:', missingVars.join(', '));
      process.exit(1);
    }
    throw error;
  }
}

export const env = parseEnv();
