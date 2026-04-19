# Gateway API Documentation

This document describes all available API endpoints in the RelayGrid Gateway service.

## Base URL

```
http://localhost:3002
```

## Authentication

All endpoints (except `/health` and `/metrics`) require API key authentication via the `x-api-key` header.

```bash
curl -H "x-api-key: your-api-key" http://localhost:3002/events
```

## Endpoints

### Health

#### GET /health
Health check endpoint.

**Response**
```json
{
  "status": "ok",
  "uptime": 123,
  "version": "1.0.0"
}
```

#### GET /metrics
Prometheus metrics endpoint for monitoring.

**Response**: `text/plain` - Prometheus metrics format

---

### Events

#### GET /events
List all events for the authenticated tenant.

**Query Parameters**
- `limit` (number, optional): Number of events to return (default: 50)
- `cursor` (string, optional): Pagination cursor for next page
- `status` (string, optional): Filter by event status
- `source_type` (string, optional): Filter by source type

**Response**
```json
{
  "data": [
    {
      "id": "string",
      "tenant_id": "string",
      "source_type": "string",
      "s3_key": "string",
      "status": "string",
      "received_at": "ISO8601 timestamp",
      "delivered_at": "ISO8601 timestamp"
    }
  ],
  "next_cursor": "string|null"
}
```

#### GET /events/:id
Get a single event by ID with delivery attempts.

**Response**
```json
{
  "event": {
    "id": "string",
    "tenant_id": "string",
    "source_id": "string",
    "source_type": "string",
    "s3_key": "string",
    "status": "string",
    "received_at": "ISO8601 timestamp",
    "delivered_at": "ISO8601 timestamp"
  },
  "attempts": [
    {
      "id": "string",
      "event_id": "string",
      "destination_id": "string",
      "status_code": "number",
      "attempted_at": "ISO8601 timestamp",
      "latency_ms": "number"
    }
  ]
}
```

#### POST /events/:id/replay
Replay a failed event by re-queuing it for delivery.

**Response**
```json
{
  "queued": true
}
```

#### GET /events/sources
List all webhook sources for the tenant.

**Response**
```json
{
  "data": [
    {
      "id": "string",
      "tenant_id": "string",
      "slug": "string",
      "source_type": "string",
      "signing_secret": "string",
      "created_at": "ISO8601 timestamp"
    }
  ]
}
```

#### POST /events/sources
Create a new webhook source.

**Request Body**
```json
{
  "slug": "string",
  "source_type": "stripe|github|twilio|generic",
  "signing_secret": "string"
}
```

**Response**
```json
{
  "data": {
    "id": "string",
    "tenant_id": "string",
    "slug": "string",
    "source_type": "string",
    "signing_secret": "string",
    "created_at": "ISO8601 timestamp"
  }
}
```

#### DELETE /events/sources/:id
Delete a webhook source.

**Response**
```json
{
  "deleted": true
}
```

#### GET /events/destinations
List all webhook destinations for the tenant.

**Response**
```json
{
  "data": [
    {
      "id": "string",
      "tenant_id": "string",
      "url": "string",
      "label": "string|null",
      "timeout_ms": "number",
      "created_at": "ISO8601 timestamp"
    }
  ]
}
```

#### POST /events/destinations
Create a new webhook destination.

**Request Body**
```json
{
  "url": "string (URI format)",
  "label": "string (optional)",
  "timeout_ms": "number (optional, default: 10000)"
}
```

**Response**
```json
{
  "data": {
    "id": "string",
    "tenant_id": "string",
    "url": "string",
    "label": "string|null",
    "timeout_ms": "number",
    "created_at": "ISO8601 timestamp"
  }
}
```

#### DELETE /events/destinations/:id
Delete a webhook destination.

**Response**
```json
{
  "deleted": true
}
```

#### GET /events/metrics/summary
Get event metrics summary for the last 24 hours.

**Response**
```json
{
  "total_events_24h": 1000,
  "delivered_24h": 950,
  "failed_24h": 50,
  "queue_depth": 10,
  "dlq_depth": 2,
  "avg_latency_ms": 250
}
```

---

### Ingest

#### POST /in/:sourceSlug
Ingest webhook events from external sources. This endpoint verifies webhook signatures before processing.

**Path Parameters**
- `sourceSlug`: The slug of the source to ingest to

**Headers**
- Webhook-specific headers for signature verification (e.g., `Stripe-Signature`, `X-Hub-Signature-256`)

**Request Body**: Raw webhook payload (JSON)

**Response**
```json
{
  "id": "string (event ID)",
  "status": "queued"
}
```

**Supported Source Types**
- `stripe`: Verifies Stripe webhook signatures
- `github`: Verifies GitHub webhook signatures
- `twilio`: Verifies Twilio webhook signatures
- `generic`: Generic HMAC signature verification

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "invalid_key"
}
```

### 404 Not Found
```json
{
  "error": "event_not_found"
}
```

```json
{
  "error": "source_not_found"
}
```

---

## Rate Limiting

Rate limiting is applied per tenant based on the plan:
- **Free**: 2 requests per second
- **Developer**: 5 requests per second
- **Startup**: 10 requests per second
- **Business**: 20 requests per second

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests per second
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Event Statuses

Events can have the following statuses:
- `received`: Event has been received and stored
- `queued`: Event is queued for delivery
- `delivering`: Event is currently being delivered
- `delivered`: Event was successfully delivered
- `failed`: Event delivery failed (will retry)
- `dead`: Event has exceeded maximum retry attempts and moved to DLQ
