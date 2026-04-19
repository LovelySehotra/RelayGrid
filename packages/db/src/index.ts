import postgres from 'postgres';
import { env } from '@relay/config';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

let sqlInstance: postgres.Sql<any> | null = null;

function parseDatabaseUrl(url: string): { host: string; port: number; database: string; username: string } {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 5432,
      database: parsed.pathname.slice(1),
      username: parsed.username,
    };
  } catch (error) {
    console.error('Failed to parse DATABASE_URL:', error);
    return { host: 'unknown', port: 5432, database: 'unknown', username: 'unknown' };
  }
}

export function sql(): postgres.Sql<any> {
  if (!sqlInstance) {
    const dbConfig = parseDatabaseUrl(env.DATABASE_URL);
    console.log(`🔌 Connecting to PostgreSQL:`);
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   Port: ${dbConfig.port}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   Username: ${dbConfig.username}`);
    
    sqlInstance = postgres(env.DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      onnotice: (notice) => {
        console.log(`📢 PostgreSQL Notice: ${notice.message}`);
      },
    });

    console.log(`✅ PostgreSQL connection established`);
  }
  return sqlInstance!;
}

export async function withTenant<T>(
  tenantId: string,
  fn: (sql: postgres.TransactionSql<any>) => Promise<T>
): Promise<T> {
  const client = sql();
  try {
    const result = await client.begin(async (sql) => {
      await sql`SET LOCAL app.tenant_id = ${tenantId}::UUID`;
      return await fn(sql);
    });
    return result as T;
  } catch (error) {
    throw error;
  }
}

export async function runMigrations(): Promise<void> {
  const client = sql();
  const migrationsDir = join(__dirname, '../migrations');

  // Ensure _migrations table exists
  await client`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Get applied migrations
  const applied = await client<{ filename: string }[]>`
    SELECT filename FROM _migrations ORDER BY id
  `;
  const appliedSet = new Set(applied.map((m) => m.filename));

  // Get migration files
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (appliedSet.has(file)) {
      continue;
    }

    console.log(`Applying migration: ${file}`);
    const sqlContent = readFileSync(join(migrationsDir, file), 'utf-8');

    try {
      await client.unsafe(sqlContent);
      await client`INSERT INTO _migrations (filename) VALUES ${client(file)}`;
      console.log(`✓ Applied ${file}`);
    } catch (error) {
      console.error(`✗ Failed to apply ${file}:`, error);
      throw error;
    }
  }
}

export async function closeConnection(): Promise<void> {
  if (sqlInstance) {
    console.log(`🔌 Closing PostgreSQL connection...`);
    await sqlInstance.end();
    sqlInstance = null;
    console.log(`✅ PostgreSQL connection closed`);
  }
}
