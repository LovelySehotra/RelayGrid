import crypto from 'crypto';
import { sql, closeConnection } from '../dist/index.js';

async function seed() {
  try {
    console.log('🌱 Seeding database...');
    const client = sql();

    // Clear existing data
    await client`TRUNCATE tenants, api_keys, sources, destinations, events CASCADE;`;

    // 1. Create a test tenant
    const tenantSlug = 'acme-corp';
    const [tenant] = await client`
      INSERT INTO tenants (slug, plan) 
      VALUES (${tenantSlug}, 'startup') 
      RETURNING id, slug, plan
    `;
    console.log(`Tenant created: ${tenant.slug} (${tenant.id})`);

    // 2. Create a test API key
    const rawApiKey = 'rg_test_key_1234567890abcdef';
    const keyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');
    const [apiKey] = await client`
      INSERT INTO api_keys (tenant_id, key_hash, label) 
      VALUES (${tenant.id}, ${keyHash}, 'Test API Key') 
      RETURNING id, label
    `;
    console.log(`API Key created: ${apiKey.label}`);
    console.log(`>>> RAW API KEY FOR TESTING: ${rawApiKey}`);

    // 3. Create a test source
    const sourceSlug = 'stripe-test';
    const [source] = await client`
      INSERT INTO sources (tenant_id, slug, source_type, signing_secret) 
      VALUES (${tenant.id}, ${sourceSlug}, 'stripe', 'whsec_stripe_test_secret') 
      RETURNING id, slug
    `;
    console.log(`Source created: ${source.slug}`);

    // 4. Create a test destination
    const [destination] = await client`
      INSERT INTO destinations (tenant_id, url, label, timeout_ms) 
      VALUES (${tenant.id}, 'http://localhost:3000/health', 'Local Gateway Health', 5000) 
      RETURNING id, url, label
    `;
    console.log(`Destination created: ${destination.label} (${destination.url})`);

    console.log('✓ Seeding completed successfully.');
  } catch (error) {
    console.error('✗ Seeding failed:', error);
  } finally {
    await closeConnection();
  }
}

seed();
