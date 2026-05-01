import React from 'react';

function CodeBlock({ code, title }: { code: string; title?: string }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 12, marginBottom: 24 }}>
      {title && (
        <div style={{ background: 'var(--bg-hover)', padding: '8px 16px', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
          {title}
        </div>
      )}
      <div className="json-viewer" style={{ margin: 0, borderRadius: 0, border: 'none' }}>
        {code}
      </div>
    </div>
  );
}

function Endpoint({ method, path, title, description, headers, body, response }: any) {
  const methodColors: Record<string, string> = {
    GET: 'var(--blue)',
    POST: 'var(--green)',
    DELETE: 'var(--red)',
  };
  const methodBg: Record<string, string> = {
    GET: 'var(--blue-dim)',
    POST: 'var(--green-dim)',
    DELETE: 'var(--red-dim)',
  };

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ 
          background: methodBg[method], color: methodColors[method], 
          padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' 
        }}>
          {method}
        </span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 600 }}>{path}</span>
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
      <p className="text-muted text-sm" style={{ marginBottom: 16, lineHeight: 1.5 }}>{description}</p>
      
      {headers && (
        <div style={{ marginBottom: 16 }}>
          <div className="section-title">Headers</div>
          <table className="headers-table w-full">
            <tbody>
              {headers.map(([k, v]: string[]) => (
                <tr key={k}><td>{k}</td><td>{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {body && <CodeBlock title="Example Request Body" code={body} />}
      {response && <CodeBlock title="Example Success Response" code={response} />}
    </div>
  );
}

export default function Docs() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header">
        <h1>API Reference</h1>
        <p>Integrate RelayGrid into your applications using our REST API.</p>
      </div>

      <div className="card mb-6" style={{ background: 'linear-gradient(to right, var(--bg-card), var(--bg-hover))' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Authentication</h2>
        <p className="text-muted text-sm mb-4" style={{ lineHeight: 1.5 }}>
          All API requests (except health checks) must be authenticated. You authenticate by providing your API key in the request header.
        </p>
        <code style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--accent)', background: 'var(--bg-base)', padding: '8px 14px', borderRadius: 6, display: 'block', border: '1px solid var(--border)' }}>
          X-Api-Key: relay_live_xxxxxxxxxxxxxxxx
        </code>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 40, marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>1. Webhook Ingestion</h2>
      <Endpoint 
        method="POST" path="/in/:sourceSlug" 
        title="Ingest Webhook Event"
        description="Accepts incoming webhooks from configured sources (Stripe, GitHub, Twilio, Generic). Verifies the signature and enqueues the payload for delivery."
        headers={[
          ['X-Api-Key', '<YOUR_API_KEY>'],
          ['Content-Type', 'application/json'],
          ['<Source-Signature>', 'Signature header specific to the source type']
        ]}
        body={`{\n  "id": "evt_123",\n  "object": "event",\n  "type": "payment_intent.succeeded"\n}`}
        response={`{\n  "id": "01HZ3M9X2K8L5P0Q",\n  "status": "queued"\n}`}
      />

      <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 40, marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>2. Events Module</h2>
      <Endpoint 
        method="GET" path="/events" 
        title="List Events"
        description="Retrieves a paginated list of webhook events. Supports filtering by status and source_type."
        response={`{\n  "data": [\n    {\n      "id": "evt_01HZ3M...",\n      "source_type": "stripe",\n      "status": "delivered",\n      "received_at": "2024-10-24T12:00:00Z"\n    }\n  ],\n  "next_cursor": "2024-10-24T12:00:00Z,evt_01HZ..."\n}`}
      />
      <Endpoint 
        method="GET" path="/events/:id" 
        title="Get Event Details"
        description="Retrieves metadata and delivery attempts for a specific event."
      />
      <Endpoint 
        method="POST" path="/events/:id/replay" 
        title="Replay Event"
        description="Manually requeues a specific event for delivery."
        response={`{\n  "queued": true\n}`}
      />

      <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 40, marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>3. Configuration</h2>
      <Endpoint method="GET" path="/events/sources" title="List Sources" description="Returns all configured webhook ingestion sources." />
      <Endpoint 
        method="POST" path="/events/sources" 
        title="Create Source"
        description="Create a new webhook ingestion source."
        body={`{\n  "slug": "my-stripe",\n  "source_type": "stripe",\n  "signing_secret": "whsec_..."\n}`}
      />
      <Endpoint method="DELETE" path="/events/sources/:id" title="Delete Source" description="Removes a source configuration." />

      <Endpoint method="GET" path="/events/destinations" title="List Destinations" description="Returns all configured webhook delivery destinations." />
      <Endpoint 
        method="POST" path="/events/destinations" 
        title="Create Destination"
        description="Create a new webhook delivery destination."
        body={`{\n  "url": "https://api.my-app.com/webhooks",\n  "label": "Production API",\n  "timeout_ms": 10000\n}`}
      />
      <Endpoint method="DELETE" path="/events/destinations/:id" title="Delete Destination" description="Removes a destination configuration." />
      <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 40, marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>4. Observability</h2>
      <Endpoint 
        method="GET" path="/events/metrics/summary" 
        title="Get Metrics Summary"
        description="Returns KPIs for the dashboard overview."
        response={`{\n  "total_events_24h": 1284092,\n  "delivered_24h": 1260858,\n  "failed_24h": 23234,\n  "queue_depth": 0,\n  "dlq_depth": 3,\n  "avg_latency_ms": 142\n}`}
      />

      <Endpoint 
        method="GET" path="/health" 
        title="Health Check"
        description="Public endpoint to check system health."
        response={`{\n  "status": "ok",\n  "uptime": 1205,\n  "version": "1.0.0"\n}`}
      />
      <Endpoint 
        method="GET" path="/metrics" 
        title="Prometheus Metrics"
        description="Public endpoint exposing Prometheus-compatible metrics."
      />

      <div className="card mb-6" style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Postman Collection</h2>
        <p className="text-muted text-sm mb-4" style={{ lineHeight: 1.5 }}>
          You can download the full Postman collection to test the API locally. Make sure to set the <code>baseUrl</code> and <code>apiKey</code> variables in your Postman environment.
        </p>
        <button className="btn btn-secondary" onClick={() => {
          const content = `{"info":{"name":"RelayGrid API","schema":"https://schema.getpostman.com/json/collection/v2.1.0/collection.json"},"variable":[{"key":"baseUrl","value":"http://localhost:3000"},{"key":"apiKey","value":"YOUR_API_KEY","type":"string"}],"item":[{"name":"Events","item":[{"name":"List Events","request":{"method":"GET","header":[{"key":"X-Api-Key","value":"{{apiKey}}"}],"url":{"raw":"{{baseUrl}}/events?limit=50","host":["{{baseUrl}}"],"path":["events"],"query":[{"key":"limit","value":"50"}]}}},{"name":"Get Event Details","request":{"method":"GET","header":[{"key":"X-Api-Key","value":"{{apiKey}}"}],"url":{"raw":"{{baseUrl}}/events/:id","host":["{{baseUrl}}"],"path":["events",":id"],"variable":[{"key":"id","value":"evt_123"}]}}}]},{"name":"Sources & Destinations","item":[{"name":"List Sources","request":{"method":"GET","header":[{"key":"X-Api-Key","value":"{{apiKey}}"}],"url":{"raw":"{{baseUrl}}/events/sources","host":["{{baseUrl}}"],"path":["events","sources"]}}}]}]}`;
          const blob = new Blob([content], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'RelayGrid.postman_collection.json'; a.click();
        }}>
          Download Postman Collection
        </button>
      </div>

    </div>
  );
}
