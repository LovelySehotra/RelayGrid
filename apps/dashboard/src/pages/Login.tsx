import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../lib/demo-context';
import { Zap, Key } from 'lucide-react';

export default function Login() {
  const [key, setKey] = useState('');
  const { setIsDemo } = useDemo();
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    localStorage.setItem('relay_api_key', key.trim());
    setIsDemo(false);
    navigate('/');
  }

  function useDemo_() {
    localStorage.removeItem('relay_api_key');
    setIsDemo(true);
    navigate('/');
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo"><Zap size={22} color="#fff" /></div>
        <h1>RelayGrid Dashboard</h1>
        <p>Enter your API key to connect to your tenant, or use demo mode to explore with synthetic data.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">API Key</label>
            <div style={{ position: 'relative' }}>
              <Key size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                style={{ paddingLeft: 36 }}
                type="password"
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="relay_live_xxxxxxxxxxxxxxxx"
                autoFocus
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center', marginBottom: 12 }}>
            Connect
          </button>
          <button type="button" className="btn btn-secondary w-full" style={{ justifyContent: 'center' }} onClick={useDemo_}>
            Use Demo Mode
          </button>
        </form>
      </div>
    </div>
  );
}
