import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvents } from '../hooks';
import StatusBadge from '../components/StatusBadge';
import { formatDistanceToNow } from 'date-fns';
import type { EventStatus, SourceType } from '../types';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export default function EventsLog() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<EventStatus | ''>('');
  const [sourceType, setSourceType] = useState<SourceType | ''>('');
  const [cursor, setCursor] = useState<string | undefined>();
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);

  const { data, isLoading } = useEvents({ status: status || undefined, source_type: sourceType || undefined, cursor, limit: 20 });

  function nextPage() {
    if (!data?.next_cursor) return;
    setCursorHistory(h => [...h, cursor ?? '']);
    setCursor(data.next_cursor);
  }
  function prevPage() {
    const prev = cursorHistory[cursorHistory.length - 1];
    setCursorHistory(h => h.slice(0, -1));
    setCursor(prev || undefined);
  }

  return (
    <>
      <div className="page-header">
        <h1>Events Log</h1>
        <p>All webhook events received by your tenant, with filtering and pagination.</p>
      </div>

      <div className="filter-bar mb-4">
        <select className="filter-select" value={status} onChange={e => { setStatus(e.target.value as EventStatus | ''); setCursor(undefined); setCursorHistory([]); }}>
          <option value="">All Statuses</option>
          <option value="received">Received</option>
          <option value="queued">Queued</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
          <option value="dead">Dead</option>
        </select>
        <select className="filter-select" value={sourceType} onChange={e => { setSourceType(e.target.value as SourceType | ''); setCursor(undefined); setCursorHistory([]); }}>
          <option value="">All Sources</option>
          <option value="stripe">Stripe</option>
          <option value="github">GitHub</option>
          <option value="twilio">Twilio</option>
          <option value="generic">Generic</option>
        </select>
        {(status || sourceType) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setStatus(''); setSourceType(''); setCursor(undefined); setCursorHistory([]); }}>Clear Filters</button>
        )}
      </div>

      <div className="card">
        {isLoading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Source Type</th>
                  <th>Status</th>
                  <th>Received At</th>
                  <th>Delivered At</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data?.data.length === 0 && (
                  <tr><td colSpan={6} className="empty-state">No events match the current filters.</td></tr>
                )}
                {data?.data.map(ev => (
                  <tr key={ev.id} onClick={() => navigate(`/events/${ev.id}`)}>
                    <td className="td-mono">{ev.id.slice(0, 22)}…</td>
                    <td style={{ textTransform: 'capitalize' }}>{ev.source_type}</td>
                    <td><StatusBadge status={ev.status} /></td>
                    <td className="td-muted">{formatDistanceToNow(new Date(ev.received_at), { addSuffix: true })}</td>
                    <td className="td-muted">{ev.delivered_at ? formatDistanceToNow(new Date(ev.delivered_at), { addSuffix: true }) : '—'}</td>
                    <td><ChevronRight size={14} color="var(--text-muted)" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination">
          <span className="pagination-info">Showing {data?.data.length ?? 0} events</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={prevPage} disabled={cursorHistory.length === 0}>
              <ChevronLeft size={14} /> Previous
            </button>
            <button className="btn btn-secondary btn-sm" onClick={nextPage} disabled={!data?.next_cursor}>
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
