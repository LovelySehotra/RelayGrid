import React, { useState } from 'react';
import { Terminal, Search, Filter, Box } from 'lucide-react';
import { TEST_CONFIG } from '../lib/test-config';
import EndpointTester from '../components/TestRunner/EndpointTester';

export default function TestDashboard() {
  const [search, setSearch] = useState('');
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const modules = Array.from(new Set(TEST_CONFIG.map(e => e.module)));
  const filteredEndpoints = TEST_CONFIG.filter(e => 
    (e.path.toLowerCase().includes(search.toLowerCase()) || 
     e.description.toLowerCase().includes(search.toLowerCase())) &&
    (!activeModule || e.module === activeModule)
  );

  return (
    <div className="test-dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">API Test Center</h1>
          <p className="page-subtitle">Test backend endpoints directly from the browser</p>
        </div>
        <div className="header-stats">
          <div className="stat-card">
            <div className="stat-label">Total Endpoints</div>
            <div className="stat-value">{TEST_CONFIG.length}</div>
          </div>
        </div>
      </div>

      <div className="test-controls">
        <div className="search-group">
          <Search size={16} />
          <input 
            placeholder="Search endpoints or descriptions..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="module-filters">
          <button 
            className={`filter-btn ${!activeModule ? 'active' : ''}`}
            onClick={() => setActiveModule(null)}
          >
            All Modules
          </button>
          {modules.map(mod => (
            <button 
              key={mod}
              className={`filter-btn ${activeModule === mod ? 'active' : ''}`}
              onClick={() => setActiveModule(mod)}
            >
              {mod}
            </button>
          ))}
        </div>
      </div>

      <div className="endpoint-list">
        {filteredEndpoints.length === 0 ? (
          <div className="empty-state">
            <Box size={48} />
            <h3>No endpoints found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          modules.filter(m => !activeModule || m === activeModule).map(mod => {
            const modEndpoints = filteredEndpoints.filter(e => e.module === mod);
            if (modEndpoints.length === 0) return null;

            return (
              <div key={mod} className="module-section">
                <h2 className="module-title">{mod}</h2>
                <div className="module-endpoints">
                  {modEndpoints.map(endpoint => (
                    <EndpointTester key={endpoint.id} config={endpoint} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="test-footer">
        <Terminal size={14} />
        <span>Future endpoints added to the backend will automatically appear here once added to the config.</span>
      </div>
    </div>
  );
}
