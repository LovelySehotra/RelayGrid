import { useState } from 'react';
import { useDemo } from '../lib/demo-context';
import { useToast } from '../components/Toast';
import { Key, Save } from 'lucide-react';

export default function Settings() {
  const { isDemo, setIsDemo } = useDemo();
  const { show } = useToast();
  const [key, setKey] = useState(() => localStorage.getItem('relay_api_key') ?? '');

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (key.trim()) {
      localStorage.setItem('relay_api_key', key.trim());
      setIsDemo(false);
      show('API key saved. Connected to live API.', 'success');
    } else {
      localStorage.removeItem('relay_api_key');
      setIsDemo(true);
      show('API key removed. Switched to demo mode.', 'success');
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Configure your API key and connection preferences.</p>
      </div>

      <div className="card" style={{ maxWidth: 540 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>API Authentication</h2>
        <p className="text-muted text-sm" style={{ marginBottom: 20 }}>
          Your API key is stored in localStorage and sent as <code style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--accent-hover)' }}>X-Api-Key</code> with every request.
        </p>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">API Key</label>
            <div style={{ position: 'relative' }}>
              <Key size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="form-input" style={{ paddingLeft: 36 }} type="password"
                value={key} onChange={e => setKey(e.target.value)} placeholder="relay_live_xxxxxxxxxxxxxxxx" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button type="submit" className="btn btn-primary"><Save size={14} /> Save</button>
            <span className={`badge ${isDemo ? 'badge-queued' : 'badge-delivered'}`}>
              <span className="badge-dot" />
              {isDemo ? 'Demo Mode' : 'Live API'}
            </span>
          </div>
        </form>
      </div>

      <div className="card" style={{ maxWidth: 540, marginTop: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>API Base URL</h2>
        <p className="text-muted text-sm" style={{ marginBottom: 12 }}>
          The dashboard proxies all requests through <code style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--accent-hover)' }}>/api</code> to your Fastify gateway.
        </p>
        <code style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--green)', background: 'var(--bg-hover)', padding: '8px 14px', borderRadius: 6, display: 'block' }}>
          http://localhost:3000
        </code>
      </div>
    </>
  );
}
