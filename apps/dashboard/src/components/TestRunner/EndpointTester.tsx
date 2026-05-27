import React, { useState } from 'react';
import { Play, ChevronDown, ChevronRight, Copy, Check, Clock, AlertCircle } from 'lucide-react';
import { EndpointConfig } from '../../lib/test-config';

interface Props {
  config: EndpointConfig;
}

export default function EndpointTester({ config }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [time, setTime] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Form states
  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [body, setBody] = useState<string>(
    config.body ? JSON.stringify(config.body, null, 2) : ''
  );

  const execute = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    setStatus(null);
    setTime(null);

    const start = performance.now();
    try {
      // Build path
      let path = config.path;
      Object.entries(pathParams).forEach(([key, value]) => {
        path = path.replace(`:${key}`, value);
      });

      // Build query
      const q = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value) q.set(key, value);
      });
      const queryString = q.toString();
      const url = `/api${path}${queryString ? `?${queryString}` : ''}`;

      const res = await fetch(url, {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': localStorage.getItem('relay_api_key') || '',
          ...config.headers,
        },
        body: config.method !== 'GET' ? body : undefined,
      });

      const data = await res.json().catch(() => ({}));
      setStatus(res.status);
      setResponse(data);
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setTime(Math.round(performance.now() - start));
    }
  };

  const copyResponse = () => {
    navigator.clipboard.writeText(JSON.stringify(response, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`endpoint-tester ${isOpen ? 'open' : ''}`}>
      <div className="endpoint-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="method-badge" data-method={config.method}>
          {config.method}
        </div>
        <div className="path-text">{config.path}</div>
        <div className="description-text">{config.description}</div>
        <div className="header-actions">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </div>

      {isOpen && (
        <div className="endpoint-content">
          <div className="test-grid">
            <div className="test-inputs">
              {config.pathParams && (
                <div className="input-group">
                  <label>Path Parameters</label>
                  {config.pathParams.map(param => (
                    <div key={param.name} className="param-field">
                      <span className="param-name">{param.name}</span>
                      <input
                        placeholder={param.type}
                        value={pathParams[param.name] || ''}
                        onChange={e => setPathParams({ ...pathParams, [param.name]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              )}

              {config.queryParams && (
                <div className="input-group">
                  <label>Query Parameters</label>
                  {config.queryParams.map(param => (
                    <div key={param.name} className="param-field">
                      <span className="param-name">{param.name}</span>
                      {param.type === 'enum' ? (
                        <select
                          value={queryParams[param.name] || ''}
                          onChange={e => setQueryParams({ ...queryParams, [param.name]: e.target.value })}
                        >
                          <option value="">None</option>
                          {param.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          placeholder={param.type}
                          value={queryParams[param.name] || ''}
                          onChange={e => setQueryParams({ ...queryParams, [param.name]: e.target.value })}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {config.method !== 'GET' && (
                <div className="input-group">
                  <label>Request Body</label>
                  <textarea
                    rows={8}
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    className="code-editor"
                  />
                </div>
              )}

              <button
                className="execute-btn"
                disabled={loading}
                onClick={execute}
              >
                {loading ? (
                  <span className="loading-spinner-small" />
                ) : (
                  <><Play size={14} /> Execute Request</>
                )}
              </button>
            </div>

            <div className="test-results">
              <div className="results-header">
                <label>Response</label>
                <div className="results-meta">
                  {status && (
                    <span className={`status-pill ${status < 400 ? 'success' : 'error'}`}>
                      {status}
                    </span>
                  )}
                  {time && (
                    <span className="time-pill">
                      <Clock size={12} /> {time}ms
                    </span>
                  )}
                  {response && (
                    <button className="copy-btn" onClick={copyResponse}>
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
              </div>

              <div className="response-viewer">
                {loading ? (
                  <div className="results-placeholder">Executing request...</div>
                ) : error ? (
                  <div className="error-display">
                    <AlertCircle size={20} />
                    <div>
                      <div className="error-title">Request Failed</div>
                      <div className="error-message">{error}</div>
                    </div>
                  </div>
                ) : response ? (
                  <pre className="json-output">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                ) : (
                  <div className="results-placeholder">
                    Execute a request to see the response here
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
