import { useState } from 'react';
import { useSources, useCreateSource, useDeleteSource } from '../hooks';
import { useToast } from '../components/Toast';
import { useDemo } from '../lib/demo-context';
import { Plus, Trash2, Zap, Github, Radio, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { SourceType } from '../types';

const ICONS: Record<SourceType, React.ReactNode> = {
  stripe: <Zap size={16} color="var(--accent)" />,
  github: <Github size={16} color="var(--text-secondary)" />,
  twilio: <Radio size={16} color="var(--red)" />,
  generic: <Globe size={16} color="var(--blue)" />,
};
const ICON_CLASSES: Record<SourceType, string> = {
  stripe: 'resource-icon resource-icon-stripe',
  github: 'resource-icon resource-icon-github',
  twilio: 'resource-icon resource-icon-twilio',
  generic: 'resource-icon resource-icon-generic',
};

export default function Sources() {
  const { data, isLoading } = useSources();
  const create = useCreateSource();
  const del = useDeleteSource();
  const { show } = useToast();
  const { isDemo } = useDemo();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ slug: '', source_type: 'stripe' as SourceType, signing_secret: '' });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (isDemo) { show('Switch to live API to create sources', 'error'); return; }
    try {
      await create.mutateAsync(form);
      show('Source created!', 'success');
      setOpen(false);
      setForm({ slug: '', source_type: 'stripe', signing_secret: '' });
    } catch (err: any) { show(err.message, 'error'); }
  }

  async function handleDelete(id: string, slug: string) {
    if (isDemo) { show('Switch to live API to delete sources', 'error'); return; }
    if (!confirm(`Delete source "${slug}"?`)) return;
    try { await del.mutateAsync(id); show('Source deleted', 'success'); }
    catch (err: any) { show(err.message, 'error'); }
  }

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1>Sources</h1>
          <p>Webhook ingestion endpoints — each source maps to a unique URL path.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} /> New Source</button>
      </div>

      {isLoading && <div className="loading-center"><div className="spinner" /></div>}

      <div className="resource-list">
        {data?.data.map(s => (
          <div key={s.id} className="resource-item">
            <div className={ICON_CLASSES[s.source_type]}>{ICONS[s.source_type]}</div>
            <div className="resource-info">
              <div className="resource-name">{s.slug}</div>
              <div className="resource-meta">
                <code style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>POST /in/{s.slug}</code>
                &nbsp;·&nbsp; {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
              </div>
            </div>
            <span className="resource-tag">{s.source_type}</span>
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id, s.slug)}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {data?.data.length === 0 && <div className="empty-state">No sources yet. Create one to start ingesting webhooks.</div>}
      </div>

      {open && (
        <div className="dialog-overlay" onClick={() => setOpen(false)}>
          <div className="dialog-box" onClick={e => e.stopPropagation()}>
            <div className="dialog-title">Create New Source</div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Slug</label>
                <input className="form-input" placeholder="my-stripe-source" value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Source Type</label>
                <select className="form-input" value={form.source_type}
                  onChange={e => setForm(f => ({ ...f, source_type: e.target.value as SourceType }))}>
                  <option value="stripe">Stripe</option>
                  <option value="github">GitHub</option>
                  <option value="twilio">Twilio</option>
                  <option value="generic">Generic</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Signing Secret</label>
                <input className="form-input" type="password" placeholder="whsec_..." value={form.signing_secret}
                  onChange={e => setForm(f => ({ ...f, signing_secret: e.target.value }))} required />
              </div>
              <div className="dialog-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={create.isPending}>
                  {create.isPending ? 'Creating...' : 'Create Source'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
