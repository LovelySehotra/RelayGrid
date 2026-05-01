import { useDemo } from '../lib/demo-context';
import { Zap, Info } from 'lucide-react';

export default function DemoModeBanner() {
  const { isDemo, setIsDemo } = useDemo();

  if (!isDemo) return (
    <div className="demo-banner" style={{ background: 'rgba(34,197,94,0.08)', borderBottomColor: 'rgba(34,197,94,0.25)', color: 'var(--green)' }}>
      <Info size={14} />
      <span>Connected to live API — all changes are real.</span>
      <button
        style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        onClick={() => { localStorage.removeItem('relay_api_key'); setIsDemo(true); }}
      >Switch to Demo</button>
    </div>
  );

  return (
    <div className="demo-banner">
      <Zap size={14} />
      <span>
        <strong>Demo Mode</strong> — Showing synthetic data. No API key required.
      </span>
      <button onClick={() => {
        const key = prompt('Enter your API key:');
        if (key) { localStorage.setItem('relay_api_key', key); setIsDemo(false); }
      }}>Connect Real API</button>
    </div>
  );
}
