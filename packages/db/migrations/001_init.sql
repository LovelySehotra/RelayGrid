-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tenants Table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'developer', 'startup', 'business')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. API Keys Table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key_hash TEXT UNIQUE NOT NULL,
  label TEXT,
  revoked_at TIMESTAMPTZ,
  grace_period_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on api_keys key_hash for fast lookups during ingestion
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);

-- 3. Sources Table
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('stripe', 'github', 'twilio', 'generic')),
  signing_secret TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

CREATE INDEX idx_sources_tenant_slug ON sources(tenant_id, slug);

-- 4. Destinations Table
CREATE TABLE destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  label TEXT,
  timeout_ms INTEGER NOT NULL DEFAULT 10000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_destinations_tenant ON destinations(tenant_id);

-- 5. Events Table
CREATE TABLE events (
  id VARCHAR(26) PRIMARY KEY, -- ULIDs are 26 chars
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('stripe', 'github', 'twilio', 'generic')),
  s3_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('received', 'queued', 'delivered', 'failed', 'dead')),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

CREATE INDEX idx_events_tenant_status ON events(tenant_id, status);
CREATE INDEX idx_events_received_at ON events(received_at DESC);

-- 6. Delivery Attempts Table
CREATE TABLE delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(26) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  destination_id UUID REFERENCES destinations(id) ON DELETE SET NULL,
  attempt_num INTEGER NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  latency_ms INTEGER,
  error TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attempts_event ON delivery_attempts(event_id);
CREATE INDEX idx_attempts_destination ON delivery_attempts(destination_id);

-- 7. Schema Registry Table
CREATE TABLE schema_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  version INTEGER NOT NULL,
  json_schema JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, source_type, version)
);

CREATE INDEX idx_schema_tenant_source ON schema_registry(tenant_id, source_type);

-- 8. Dead Letters Table
CREATE TABLE dead_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(26) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  error TEXT,
  payload_s3_key TEXT,
  failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dead_letters_tenant ON dead_letters(tenant_id);

-- Row-Level Security (RLS) Configuration
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE dead_letters ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies
-- We allow access if current_setting('app.tenant_id') equals the row's tenant_id.
-- For the tenants table itself, id is the tenant_id.
CREATE POLICY tenant_isolation_tenants ON tenants 
  USING (id = NULLIF(current_setting('app.tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_api_keys ON api_keys 
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_sources ON sources 
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_destinations ON destinations 
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_events ON events 
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::UUID);

-- delivery_attempts does not have tenant_id directly, but we can query it via event_id
CREATE POLICY tenant_isolation_delivery_attempts ON delivery_attempts 
  USING (event_id IN (SELECT id FROM events WHERE tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::UUID));

CREATE POLICY tenant_isolation_schema_registry ON schema_registry 
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_dead_letters ON dead_letters 
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::UUID);
