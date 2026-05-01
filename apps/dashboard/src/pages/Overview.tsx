import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMetrics, useEvents } from '../hooks';
import { DEMO_CHART_DATA } from '../lib/demo-data';
import StatusBadge from '../components/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Zap, CheckCircle2, Layers, Timer, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

export default function Overview() {
  const [period, setPeriod] = useState('24h');
  const { data: metrics } = useMetrics();
  const { data: eventsData } = useEvents({ limit: 10 });
  const navigate = useNavigate();

  const successRate = metrics
    ? ((metrics.delivered_24h / Math.max(metrics.total_events_24h, 1)) * 100).toFixed(1)
    : '0';

  const recentFailed = eventsData?.data.filter(e => e.status === 'failed' || e.status === 'dead').slice(0, 3) ?? [];

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>System Overview</h1>
          <p>Real-time health and delivery metrics across all clusters.</p>
        </div>
        <div className="period-toggle">
          {['24h', '7d', '30d'].map(p => (
            <button key={p} className={`period-btn${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>{p}</button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-label">Total Events (24h) <Zap size={14} color="var(--accent)" /></div>
          <div className="metric-value">{metrics ? fmt(metrics.total_events_24h) : '—'}</div>
          <div className="metric-sub"><span className="metric-trend trend-up">+12.4%</span> vs yesterday</div>
          <div className="metric-bar"><div className="metric-bar-fill" style={{ width: '72%', background: 'var(--accent)' }} /></div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Delivery Success <CheckCircle2 size={14} color="var(--green)" /></div>
          <div className="metric-value">{successRate}%</div>
          <div className="metric-sub"><span className="metric-trend trend-down">-0.1%</span> vs yesterday</div>
          <div className="metric-bar"><div className="metric-bar-fill" style={{ width: `${successRate}%`, background: 'var(--green)' }} /></div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Queue Depth <Layers size={14} color="var(--blue)" /></div>
          <div className="metric-value">{metrics?.queue_depth ?? '—'}</div>
          <div className="metric-sub" style={{ color: 'var(--green)' }}>Optimal</div>
          <div className="metric-bar"><div className="metric-bar-fill" style={{ width: '2%', background: 'var(--blue)' }} /></div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Avg Latency <Timer size={14} color="var(--orange)" /></div>
          <div className="metric-value">{metrics ? `${metrics.avg_latency_ms}ms` : '—'}</div>
          <div className="metric-sub"><span className="metric-trend trend-up">-14ms</span> vs yesterday</div>
          <div className="metric-bar"><div className="metric-bar-fill" style={{ width: '30%', background: 'var(--orange)' }} /></div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Layers size={14} /> Event Volume (24H)</div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />SUCCESS</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />FAILED</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={DEMO_CHART_DATA} barGap={2}>
              <XAxis dataKey="hour" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} interval={5} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'var(--text-secondary)' }}
              />
              <Bar dataKey="success" fill="var(--accent)" radius={[3, 3, 0, 0]} opacity={0.85} />
              <Bar dataKey="failed" fill="var(--red)" radius={[3, 3, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title"><AlertTriangle size={14} color="var(--red)" /> Recent Failures</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/events?status=failed')}>VIEW ALL</button>
          </div>
          <div className="failures-list">
            {recentFailed.length === 0 && <div className="empty-state">No recent failures 🎉</div>}
            {recentFailed.map(e => (
              <div key={e.id} className="failure-item" style={{ cursor: 'pointer' }} onClick={() => navigate(`/events/${e.id}`)}>
                <div style={{ flex: 1 }}>
                  <div className="failure-id">{e.id.slice(0, 16)}...</div>
                  <div className="failure-dest">Source: {e.source_type}</div>
                </div>
                <div>
                  <span className="failure-code failure-502">{e.status.toUpperCase()}</span>
                  <div className="failure-time">{formatDistanceToNow(new Date(e.received_at), { addSuffix: true })}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="refresh-note" style={{ marginTop: 14 }}>Auto-refreshing every 30s</div>
        </div>
      </div>

      {/* Latest Transactions */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Latest Webhook Transactions</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Source Type</th>
                <th>Status</th>
                <th>Received At</th>
              </tr>
            </thead>
            <tbody>
              {(eventsData?.data ?? []).map(ev => (
                <tr key={ev.id} onClick={() => navigate(`/events/${ev.id}`)}>
                  <td className="td-mono">{ev.id.slice(0, 20)}...</td>
                  <td style={{ textTransform: 'capitalize' }}>{ev.source_type}</td>
                  <td><StatusBadge status={ev.status} /></td>
                  <td className="td-muted">{formatDistanceToNow(new Date(ev.received_at), { addSuffix: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
