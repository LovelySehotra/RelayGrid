# API Testing Document (RelayGrid)

This document provides a comprehensive overview of all API endpoints in the RelayGrid platform. 

## Authentication
Unless otherwise specified, all endpoints require authentication via the `X-Api-Key` header.
- **Header**: `X-Api-Key`
- **Value**: Your tenant API key.

---

## 1. Webhook Ingestion Module

### Ingest Webhook Event
Accepts incoming webhooks from configured sources (Stripe, GitHub, Twilio, Generic).

- **Method**: `POST`
- **Route**: `/in/:sourceSlug`
- **Auth Required**: Yes (`X-Api-Key` header) + Signature validation.
- **Headers**:
  - `X-Api-Key`: `<API_KEY>`
  - `Content-Type`: `application/json` (or specific to source)
  - *Signature headers specific to the source type (e.g., `Stripe-Signature`)*
- **Path Parameters**:
  - `sourceSlug`: The unique slug of the source configured in the dashboard.

**Example Request:**
```json
POST /in/stripe-webhooks
X-Api-Key: relay_live_xxxxxxxxxxxxxxxx
Stripe-Signature: t=1698157921,v1=...

{
  "id": "evt_123",
  "object": "event",
  "type": "payment_intent.succeeded"
}
```

**Example Success Response (200 OK):**
```json
{
  "id": "01HZ3M9X2K8L5P0Q",
  "status": "queued"
}
```

**Example Error Responses:**
- `401 Unauthorized`: `{"error": "invalid_signature"}`
- `404 Not Found`: `{"error": "source_not_found"}`

---

## 2. Events Module

### List Events
Retrieves a paginated list of webhook events.

- **Method**: `GET`
- **Route**: `/events`
- **Auth Required**: Yes
- **Query Parameters**:
  - `limit` (number, default: 50)
  - `cursor` (string, optional)
  - `status` (string, optional): Filter by `received`, `queued`, `delivered`, `failed`, `dead`.
  - `source_type` (string, optional): Filter by `stripe`, `github`, `twilio`, `generic`.

**Example Success Response (200 OK):**
```json
{
  "data": [
    {
      "id": "evt_01HZ3M9X2K8L5P0Q",
      "tenant_id": "tenant-123",
      "source_type": "stripe",
      "s3_key": "tenant-123/2024-10-24/evt_01HZ3M9X2K8L5P0Q.json",
      "status": "delivered",
      "received_at": "2024-10-24T12:00:00Z",
      "delivered_at": "2024-10-24T12:00:01Z"
    }
  ],
  "next_cursor": "2024-10-24T12:00:00.000Z,evt_01HZ3M9X2K8L5P0Q"
}
```

### Get Event Details
Retrieves metadata and delivery attempts for a specific event.

- **Method**: `GET`
- **Route**: `/events/:id`
- **Auth Required**: Yes

**Example Success Response (200 OK):**
```json
{
  "event": {
    "id": "evt_01HZ3M9X2K8L5P0Q",
    "status": "delivered"
  },
  "attempts": [
    {
      "id": "att_1",
      "attempt_num": 1,
      "status_code": 200,
      "latency_ms": 42,
      "error": null,
      "attempted_at": "2024-10-24T12:00:01Z"
    }
  ]
}
```

### Replay Event
Manually requeues a specific event for delivery.

- **Method**: `POST`
- **Route**: `/events/:id/replay`
- **Auth Required**: Yes

**Example Success Response (200 OK):**
```json
{
  "queued": true
}
```

---

## 3. Configuration Module (Sources & Destinations)

### List Sources
- **Method**: `GET`
- **Route**: `/events/sources`
- **Auth Required**: Yes

### Create Source
- **Method**: `POST`
- **Route**: `/events/sources`
- **Auth Required**: Yes
- **Body**:
```json
{
  "slug": "my-stripe",
  "source_type": "stripe",
  "signing_secret": "whsec_..."
}
```
**Example Success Response (200 OK):**
```json
{
  "data": {
    "id": "src_123",
    "slug": "my-stripe",
    "source_type": "stripe"
  }
}
```

### Delete Source
- **Method**: `DELETE`
- **Route**: `/events/sources/:id`
- **Auth Required**: Yes

### List Destinations
- **Method**: `GET`
- **Route**: `/events/destinations`
- **Auth Required**: Yes

### Create Destination
- **Method**: `POST`
- **Route**: `/events/destinations`
- **Auth Required**: Yes
- **Body**:
```json
{
  "url": "https://api.my-app.com/webhooks",
  "label": "Production API",
  "timeout_ms": 10000
}
```

### Delete Destination
- **Method**: `DELETE`
- **Route**: `/events/destinations/:id`
- **Auth Required**: Yes

---

## 4. Observability Module

### Get Metrics Summary
- **Method**: `GET`
- **Route**: `/events/metrics/summary`
- **Auth Required**: Yes

**Example Success Response (200 OK):**
```json
{
  "total_events_24h": 1284092,
  "delivered_24h": 1260858,
  "failed_24h": 23234,
  "queue_depth": 0,
  "dlq_depth": 3,
  "avg_latency_ms": 142
}
```

### Health Check
- **Method**: `GET`
- **Route**: `/health`
- **Auth Required**: **NO**

**Example Success Response (200 OK):**
```json
{
  "status": "ok",
  "uptime": 1205,
  "version": "1.0.0"
}
```

### Prometheus Metrics
- **Method**: `GET`
- **Route**: `/metrics`
- **Auth Required**: **NO**

---

## 5. Postman Collection (Ready to Import)

Save the following JSON as `RelayGrid.postman_collection.json` and import it into Postman:

```json
{
  "info": {
    "name": "RelayGrid API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    { "key": "baseUrl", "value": "http://localhost:3000" },
    { "key": "apiKey", "value": "YOUR_API_KEY", "type": "string" }
  ],
  "item": [
    {
      "name": "Events",
      "item": [
        {
          "name": "List Events",
          "request": {
            "method": "GET",
            "header": [{ "key": "X-Api-Key", "value": "{{apiKey}}" }],
            "url": {
              "raw": "{{baseUrl}}/events?limit=50",
              "host": ["{{baseUrl}}"],
              "path": ["events"],
              "query": [{ "key": "limit", "value": "50" }]
            }
          }
        },
        {
          "name": "Get Event Details",
          "request": {
            "method": "GET",
            "header": [{ "key": "X-Api-Key", "value": "{{apiKey}}" }],
            "url": {
              "raw": "{{baseUrl}}/events/:id",
              "host": ["{{baseUrl}}"],
              "path": ["events", ":id"],
              "variable": [{ "key": "id", "value": "evt_123" }]
            }
          }
        }
      ]
    },
    {
      "name": "Sources & Destinations",
      "item": [
        {
          "name": "List Sources",
          "request": {
            "method": "GET",
            "header": [{ "key": "X-Api-Key", "value": "{{apiKey}}" }],
            "url": { "raw": "{{baseUrl}}/events/sources", "host": ["{{baseUrl}}"], "path": ["events", "sources"] }
          }
        }
      ]
    }
  ]
}
```
