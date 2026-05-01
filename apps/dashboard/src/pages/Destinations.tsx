import { useState } from 'react';
import { useDestinations, useCreateDestination, useDeleteDestination } from '../hooks';
import { useToast } from '../components/Toast';
import { useDemo } from '../lib/demo-context';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Destinations() {
  const { data, isLoading } = useDestinations();
  const create = useCreateDestination();
  const del = useDeleteDestination();
  const { show } = useToast();
  const { isDemo } = useDemo();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ url: '', label: '', timeout_ms: 10000 });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (isDemo) { show('Switch to live API to create destinations', 'error'); return; }
    try {
      await create.mutateAsync({ ...form, label: form.label || undefined });
      show('Destination created!', 'success');
      setOpen(false);
      setForm({ url: '', label: '', timeout_ms: 10000 });
    } catch (err: any) { show(err.message, 'error'); }
  }

  async function handleDelete(id: string, label: string | null) {
    if (isDemo) { show('Switch to live API to delete destinations', 'error'); return; }
    if (!confirm(`Delete destination "${label ?? id}"?`)) return;
    try { await del.mutateAsync(id); show('Destination deleted', 'success'); }
    catch (err: any) { show(err.message, 'error'); }
  }

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>Destinations</h1>
          <p>Target endpoints where webhook payloads are delivered with retry logic.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> New Destination</button>
      </div>

      {isLoading && <div className="loading-center"><div className="spinner" /></div>}

      <div className="resource-list">
        {data?.data.map(d => (
          <div key={d.id} className="resource-item">
            <div className="resource-icon resource-icon-generic">
              <ExternalLink size={16} color="var(--blue)" />
            </div>
            <div className="resource-info">
              <div className="resource-name">{d.label ?? 'Unnamed'}</div>
              <div className="resource-meta">
                <code style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{d.url}</code>
                &nbsp;·&nbsp; timeout: {d.timeout_ms}ms
                &nbsp;·&nbsp; {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
              </div>
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(d.id, d.label)}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {data?.data.length === 0 && <div className="empty-state">No destinations yet. Add one to start delivering webhooks.</div>}
      </div>

      {open && (
        <div className="dialog-overlay" onClick={() => setOpen(false)}>
          <div className="dialog-box" onClick={e => e.stopPropagation()}>
            <div className="dialog-title">Add New Destination</div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">URL</label>
                <input className="form-input" type="url" placeholder="https://your-service.com/webhooks" value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Label (optional)</label>
                <input className="form-input" placeholder="My Service" value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Timeout (ms)</label>
                <input className="form-input" type="number" min={1000} max={60000} value={form.timeout_ms}
                  onChange={e => setForm(f => ({ ...f, timeout_ms: +e.target.value }))} />
              </div>
              <div className="dialog-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={create.isPending}>
                  {create.isPending ? 'Adding...' : 'Add Destination'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
