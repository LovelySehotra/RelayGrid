# Webhook Relay & Observability Platform

A production-grade webhook relay platform built as a pnpm monorepo. Ingest webhooks from multiple sources, store them in S3-compatible storage, and relay them to configurable destinations with retry logic, circuit breakers, and comprehensive observability.

## Architecture

- **Gateway** (`apps/gateway`): Fastify-based HTTP API for webhook ingestion, event querying, and real-time streaming
- **Worker** (`apps/worker`): BullMQ-based job processing with per-tenant queues, delivery workers, schema inference, and DLQ monitoring
- **Dashboard** (`apps/dashboard`): React + Vite + TanStack Query + Tailwind + shadcn/ui for observability and management
- **Packages**: Shared types, configuration, and database client

## Tech Stack

- **Runtime**: Node.js 20+, TypeScript 5
- **Gateway**: Fastify 4, BullMQ 5, ioredis 5, postgres (porsager), AWS SDK v3 (S3), pino
- **Worker**: BullMQ 5, ioredis 5, postgres (porsager), AWS SDK v3 (S3)
- **Dashboard**: React 18, Vite 5, TanStack Query/Table, React Router, Recharts, TailwindCSS, shadcn/ui
- **Database**: PostgreSQL 16 with Row-Level Security (RLS)
- **Queue**: Redis 7 with BullMQ
- **Storage**: S3-compatible (MinIO for local, Cloudflare R2 for production)
- **Testing**: Vitest, supertest
- **Build**: Turborepo, pnpm

## Features

- Multi-tenant architecture with API key authentication
- Per-tenant rate limiting (sliding window in Redis)
- Webhook signature verification (Stripe, GitHub, Twilio, generic)
- Per-tenant queues with plan-based concurrency limits
- Exponential backoff with jitter for retries
- Circuit breaker pattern per destination
- Schema inference and drift detection
- Dead Letter Queue monitoring
- Real-time event streaming via SSE
- Prometheus metrics endpoint
- Row-level security in PostgreSQL

## Quick Start

```bash
pnpm install
docker-compose up -d
pnpm migrate
pnpm dev
```

See [QUICKSTART.md](./QUICKSTART.md) for detailed setup instructions.

## API Documentation

For detailed API endpoint documentation, see [apps/gateway/API.md](./apps/gateway/API.md).

## Development

```bash
# Install dependencies
pnpm install

# Start infrastructure
docker-compose up -d

# Run migrations
pnpm migrate

# Start all services in dev mode
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Project Structure

```
webhookRelay/
├── packages/
│   ├── types/      # Shared TypeScript interfaces
│   ├── config/     # Zod environment variable schema
│   └── db/         # PostgreSQL client and migrations
├── apps/
│   ├── gateway/    # Fastify HTTP API
│   ├── worker/     # BullMQ job processors
│   └── dashboard/  # React UI
├── docker-compose.yml
└── pnpm-workspace.yaml
```



## License

MIT
