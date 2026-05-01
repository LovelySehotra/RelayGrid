# System Design Document (RelayGrid)

## 1. High-Level System Overview
RelayGrid is a production-grade webhook relay and observability platform. It solves the problem of receiving, securely storing, queuing, and reliably delivering webhook payloads from third-party sources (like Stripe, GitHub, Twilio) to internal or external destinations. 

Key features include:
- Multi-tenant architecture.
- Scalable, resilient delivery via BullMQ and Redis.
- Asynchronous blob storage (S3/MinIO) to handle large webhook payloads securely.
- Extensive retry mechanisms (exponential backoff, circuit breaking via dead-letter queues).
- A robust, React-based dashboard for observability, metrics, and configuration.

---

## 2. Architecture Diagram (Text Representation)

```text
                                       +-------------------+
                                       |   Dashboard UI    |
                                       | (React/Vite/TS)   |
                                       +---------+---------+
                                                 |
                                           [ REST API ]
                                                 |
+-------------------+                  +---------v---------+                +-------------------+
| Third-Party       |---(Webhooks)---> | Gateway Service   | <---(Fetch)--- | Dashboard User    |
| (Stripe, GitHub)  |                  | (Fastify Node.js) |                |                   |
+-------------------+                  +---------+---------+                +-------------------+
                                                 |
                       +-------------------------+-------------------------+
                       |                         |                         |
               +-------v-------+         +-------v-------+         +-------v-------+
               |  PostgreSQL   |         |     Redis     |         |    S3 / R2    |
               | (Metadata DB) |         |  (BullMQ DB)  |         | (Payloads DB) |
               +-------+-------+         +-------+-------+         +-------+-------+
                       |                         |                         |
                       +-------------------------+-------------------------+
                                                 |
                                       +---------v---------+
                                       |  Worker Service   |
                                       | (BullMQ Node.js)  |
                                       +---------+---------+
                                                 |
                                          (Delivers Payload)
                                                 |
                                       +---------v---------+
                                       | Target Endpoints  |
                                       |  (Destinations)   |
                                       +-------------------+
```

---

## 3. Tech Stack
- **Frontend**: React 18, Vite 5, TypeScript, Tailwind CSS, TanStack Query, TanStack Table, Recharts, shadcn/ui.
- **Backend (Gateway)**: Fastify 4, Node.js 20+, TypeScript.
- **Backend (Worker)**: BullMQ 5 (Job processing), Node.js 20+.
- **Database**: PostgreSQL 16 (porsager/postgres driver) with Row-Level Security (RLS).
- **Queues/Caching**: Redis 7, BullMQ.
- **Storage**: AWS S3 SDK v3 (MinIO for local dev, Cloudflare R2 for production).
- **Build & Monorepo**: Turborepo, pnpm.

---

## 4. Module Breakdown

### 4.1 Backend: Gateway (`apps/gateway`)
The HTTP API server built with Fastify.
- **Routes**:
  - `ingest.ts`: Receives raw webhooks, verifies signatures, saves to S3, inserts event into PostgreSQL, and enqueues the job into BullMQ.
  - `events.ts`: Exposes CRUD endpoints for managing `sources`, `destinations`, and querying `events` and `metrics`.
  - `health.ts`: Exposes `/health` and `/metrics` (Prometheus) endpoints.
- **Plugins**:
  - `auth.ts`: Middleware to validate `X-Api-Key` against the `api_keys` table and populate the `TenantContext`.
  - `redis.ts` / `postgres.ts`: Dependency injection for Redis and PostgreSQL clients.

### 4.2 Backend: Worker (`apps/worker`)
The asynchronous task processor built with BullMQ.
- **WorkerRegistry.ts**: Dynamically creates a dedicated BullMQ `Worker` instance for *each* tenant. It polls the database every 60s for new tenants to spin up workers dynamically. Concurrency is based on the tenant's plan.
- **delivery.ts**: Processes the job by downloading the payload from S3 and attempting HTTP delivery to the target destination. Records attempts in `delivery_attempts` table.
- **Queues**: Uses a per-tenant queue structure (`queue:<tenantId>`).

### 4.3 Database Package (`packages/db`)
Handles connections and migrations for PostgreSQL. Uses the fast `porsager/postgres` client.
- Exposes `sql()` client and `withTenant()` transaction helper to enforce Row-Level Security via `SET LOCAL app.tenant_id`.

### 4.4 Types Package (`packages/types`)
Shared TypeScript definitions (`WebhookEvent`, `DeliveryAttempt`, `Tenant`, `JobPayload`) ensuring type safety between all microservices and the frontend.

### 4.5 Frontend Dashboard (`apps/dashboard`)
Vite/React application providing the UI.
- **`lib/api.ts`**: Centralized fetch wrapper automatically injecting the `X-Api-Key` header.
- **`hooks/index.ts`**: Uses React Query to fetch events, metrics, and manage CRUD state.
- **Pages**:
  - `Overview`: Key performance indicators (Total, Delivered, Queue Depth, Latency) and charts.
  - `EventsLog`: Data table of all events with status/source filters.
  - `EventDetail`: Drills down into a specific event, showing request headers, a JSON viewer for the payload, and a timeline of delivery attempts. Includes a "Replay" action.
  - `Sources` / `Destinations`: Forms to map incoming source slugs to target destination URLs.

---

## 5. Core Data Flows

### Webhook Ingestion Flow
1. **Receive**: Webhook hits `POST /in/:sourceSlug`.
2. **Authenticate**: `authPlugin` checks `X-Api-Key`.
3. **Validate**: Gateway queries `sources` for the slug, uses `signing_secret` to verify the webhook signature.
4. **Store Payload**: Gateway uploads the raw JSON payload to S3 (Fire and forget).
5. **Record Event**: Gateway inserts a row into the `events` PostgreSQL table with status `received`.
6. **Enqueue**: Gateway adds a `JobPayload` to the tenant's BullMQ queue (`queue:<tenant_id>`) and a separate job for `schema-inference`.
7. **Respond**: Returns 200 OK to the webhook provider.

### Webhook Delivery Flow
1. **Process**: Worker pulls job from `queue:<tenant_id>`.
2. **Execute**: Worker attempts to POST the payload (retrieved via S3 if needed, or from job data) to the destination URLs.
3. **Record Attempt**: Worker logs the response (status code, latency) in the `delivery_attempts` table.
4. **Success/Retry**:
   - On success: Updates event status to `delivered`.
   - On failure: BullMQ automatically schedules a retry with exponential backoff (e.g., up to 8 attempts). Updates event status to `failed`.
   - On max retries: Event moves to Dead Letter Queue (DLQ) and status becomes `dead`.

---

## 6. Authentication & Authorization Flow
- **Tenant Isolation**: The system is multi-tenant. Every tenant has an API key.
- **Gateway Validation**: The `authPlugin` intercepts requests, hashes the `X-Api-Key`, checks it against the database (`api_keys` table), and caches the result in Redis for 60 seconds to reduce DB load.
- **Row-Level Security (RLS)**: PostgreSQL is configured to restrict data access. The `withTenant` function runs queries within a transaction where `SET LOCAL app.tenant_id = <tenant_id>` is executed, ensuring a query cannot accidentally read or mutate another tenant's data.

---

## 7. Database Schema
- `tenants`: Core account metadata (`id`, `plan`).
- `api_keys`: Hashed API keys linked to tenants (`key_hash`, `revoked_at`).
- `sources`: Ingestion configs (`slug`, `source_type`, `signing_secret`).
- `destinations`: Target URLs for delivery (`url`, `timeout_ms`).
- `events`: Tracks every incoming webhook (`s3_key`, `status`, `received_at`).
- `delivery_attempts`: Tracks every retry for an event (`status_code`, `latency_ms`, `error`).

---

## 8. Event-Driven Systems & Queues
- **BullMQ on Redis**: Primary event-driven backbone.
- **Per-Tenant Queues**: Instead of one massive global queue, jobs are placed in `queue:<tenant_id>`. This prevents the "noisy neighbor" problem where one tenant's massive spike in webhooks delays processing for other tenants.
- **Dynamic Workers**: The `WorkerRegistry` dynamically spins up BullMQ consumers for each tenant queue, allocating concurrency limits based on their pricing plan (Free=2, Developer=5, Startup=10, Business=20).
- **Dead Letter Queue (DLQ)**: Failed events after maximum retries are pushed to a `dlq` queue for manual review or alerting.

---

## 9. Error Handling and Logging Strategy
- **Gateway**: Uses Fastify's built-in `pino` logger for high-performance JSON logging. `pino-pretty` is used in development.
- **Worker**: Logs job failures and emits errors. Max retries prevent infinite loops.
- **Resilience**: The S3 upload is non-blocking (fire and forget) to ensure the API responds to the webhook provider quickly, preventing timeouts.
- **API Errors**: Fastify returns standard JSON error formats (e.g., `{"error": "invalid_signature"}`).

---

## 10. Key Design Decisions & Trade-offs
1. **S3 Payload Storage**: By storing the heavy JSON payloads in S3 instead of PostgreSQL or Redis, the relational database remains small, fast, and optimized purely for metadata and querying metrics. 
2. **Per-Tenant BullMQ Queues**: Solves the noisy neighbor problem natively, but requires dynamically polling for new tenants and managing many `Worker` instances in Node.js.
3. **Row-Level Security (RLS)**: Pushes tenant isolation down to the database level, preventing critical data leak bugs if a developer forgets to add a `WHERE tenant_id = ?` clause.
4. **Caching API Keys**: Redis caches API key lookups for 60 seconds to optimize the hot path of ingestion, trading off immediate key revocation for massive performance gains.
