import { useParams, useNavigate } from 'react-router-dom';
import { useEvent, useReplayEvent } from '../hooks';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import { DEMO_PAYLOAD } from '../lib/demo-data';
import { ArrowLeft, Download, RotateCcw, Copy } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import type { DeliveryAttempt } from '../types';

function codeClass(code: number | null) {
  if (!code) return 'code-pill code-timeout';
  if (code < 300) return 'code-pill code-2xx';
  if (code < 500) return 'code-pill code-4xx';
  return 'code-pill code-5xx';
}

function AttemptDot({ code }: { code: number | null }) {
  if (!code) return <div className="attempt-dot attempt-dot-warn">!</div>;
  if (code < 300) return <div className="attempt-dot attempt-dot-ok">✓</div>;
  return <div className="attempt-dot attempt-dot-fail">✗</div>;
}

function AttemptItem({ a }: { a: DeliveryAttempt }) {
  return (
    <div className="attempt-item">
      <AttemptDot code={a.status_code} />
      <div className="attempt-body">
        <div className="attempt-title">
          Attempt #{a.attempt_num}
          {' '}
          <span className={codeClass(a.status_code)}>
            {a.status_code ? `${a.status_code}` : a.error ?? 'TIMEOUT'}
          </span>
        </div>
        <div className="attempt-meta">
          {a.latency_ms && <span>⏱ {a.latency_ms}ms</span>}
          <span>{format(new Date(a.attempted_at), 'HH:mm:ss.SSS')}</span>
          {a.error && <span style={{ color: 'var(--red)' }}>{a.error}</span>}
        </div>
      </div>
    </div>
  );
}

function JsonViewer({ data }: { data: unknown }) {
  const json = JSON.stringify(data, null, 2);
  function highlight(s: string) {
    return s
      .replace(/("[\w@.-]+")\s*:/g, '<span class="json-key">$1</span>:')
      .replace(/:\s*(".*?")/g, ': <span class="json-string">$1</span>')
      .replace(/:\s*(\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
      .replace(/:\s*(true|false|null)/g, ': <span class="json-bool">$1</span>');
  }
  return (
    <div className="json-viewer" dangerouslySetInnerHTML={{ __html: highlight(json) }} />
  );
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useEvent(id!);
  const replay = useReplayEvent();
  const { show } = useToast();

  if (isLoading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!data) return <div className="empty-state">Event not found.</div>;

  const { event, attempts } = data;

  async function handleReplay() {
    try {
      await replay.mutateAsync(event.id);
      show('Event queued for replay successfully!', 'success');
    } catch (e: any) {
      show(e.message || 'Replay failed', 'error');
    }
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify({ event, attempts, payload: DEMO_PAYLOAD }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${event.id}.json`; a.click();
  }

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/events')}>
          <ArrowLeft size={14} /> Back to Events
        </button>
      </div>

      <div className="detail-header">
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
            Webhook Event &nbsp;<StatusBadge status={event.status} />
          </div>
          <div className="detail-id">{event.id}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            📅 {format(new Date(event.received_at), 'MMM dd, yyyy · HH:mm:ss.SSS')} UTC
          </div>
        </div>
        <div className="detail-actions">
          <button className="btn btn-secondary" onClick={handleExport}><Download size={14} /> Export JSON</button>
          <button className="btn btn-primary" onClick={handleReplay} disabled={replay.isPending}>
            <RotateCcw size={14} /> {replay.isPending ? 'Queuing...' : 'Replay Event'}
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Request Headers */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="section-title">Request Headers</div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 4 }}>HTTP/1.1</span>
            </div>
            <table className="headers-table w-full">
              <tbody>
                <tr><td>Content-Type</td><td>application/json</td></tr>
                <tr><td>X-Relay-Signature</td><td>t=1698157921,v1=7f9b8c7d6e5a4f3b2c1d0e9f...</td></tr>
                <tr><td>User-Agent</td><td>RelayGrid-Engine/2.4.0 (Cloud)</td></tr>
                <tr><td>X-Source-ID</td><td>src_9921_prod_{event.source_type}</td></tr>
                <tr><td>X-Api-Key</td><td>[REDACTED]</td></tr>
              </tbody>
            </table>
          </div>

          {/* Payload */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="section-title">Payload Body</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>JSON &nbsp; 2.4 KB</span>
                <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(JSON.stringify(DEMO_PAYLOAD, null, 2))}>
                  <Copy size={12} />
                </button>
              </div>
            </div>
            <JsonViewer data={DEMO_PAYLOAD} />
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Latency</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{attempts[0]?.latency_ms ?? '—'}ms</div>
              </div>
              <div style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Attempts</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{attempts.length}/5</div>
              </div>
            </div>

            <div className="section-title">Delivery Attempts</div>
            <div className="attempt-timeline">
              {attempts.length === 0 && <div className="text-muted text-sm">No delivery attempts yet.</div>}
              {[...attempts].reverse().map(a => <AttemptItem key={a.id} a={a} />)}
            </div>
            {attempts.length > 1 && (
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Exponential backoff applied. Initial delay: 2s.
              </div>
            )}
          </div>

          <div className="card">
            <div className="section-title">Destination</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🌐</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>order-processor-lambda</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>https://lambda.us-east-1.amazonaws...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
