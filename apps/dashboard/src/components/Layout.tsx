import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import DemoModeBanner from './DemoModeBanner';
import { Search } from 'lucide-react';

export default function Layout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <header className="top-bar">
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input placeholder="Search events..." />
          </div>
          <div className="top-bar-right">
            <span className="tenant-badge">TENANT: Production</span>
          </div>
        </header>
        <DemoModeBanner />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
