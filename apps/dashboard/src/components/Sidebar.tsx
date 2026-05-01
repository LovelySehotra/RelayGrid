import { NavLink } from 'react-router-dom';
import { LayoutDashboard, List, Radio, Globe, Settings, BookOpen, LifeBuoy, Plus, Zap } from 'lucide-react';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/events', label: 'Events Log', icon: List },
  { to: '/sources', label: 'Sources', icon: Radio },
  { to: '/destinations', label: 'Destinations', icon: Globe },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const BOTTOM = [
  { to: '/docs', label: 'Docs', icon: BookOpen },
  { to: '#', label: 'Support', icon: LifeBuoy },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon"><Zap size={16} color="#fff" /></div>
        <div>
          <div className="brand-name">RelayGrid</div>
          <div className="brand-sub">Webhook Engine</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        {BOTTOM.map(({ to, label, icon: Icon }) => (
          <NavLink key={label} to={to} className={({ isActive }) => `nav-item${isActive && to !== '#' ? ' active' : ''}`}>
            <Icon size={15} />{label}
          </NavLink>
        ))}
        <NavLink to="/sources" className="new-source-btn" style={{ marginTop: 8 }}>
          <Plus size={14} /> New Source
        </NavLink>
      </div>
    </aside>
  );
}
