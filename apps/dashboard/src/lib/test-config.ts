export interface EndpointParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  required?: boolean;
  options?: string[];
  default?: any;
}

export interface EndpointConfig {
  id: string;
  module: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  pathParams?: EndpointParam[];
  queryParams?: EndpointParam[];
  body?: Record<string, any>;
  headers?: Record<string, string>;
}

export const TEST_CONFIG: EndpointConfig[] = [
  // API Keys Module
  {
    id: 'list-api-keys',
    module: 'API Keys',
    method: 'GET',
    path: '/api-keys',
    description: 'List all API keys for the current tenant',
  },
  {
    id: 'create-api-key',
    module: 'API Keys',
    method: 'POST',
    path: '/api-keys',
    description: 'Generate a new API key (Note: key is only shown once)',
  },

  // Auth Module
  {
    id: 'auth-me',
    module: 'Authentication',
    method: 'GET',
    path: '/auth/me',
    description: 'Verify the current API key and get tenant information',
  },

  // Events Module
  {
    id: 'list-events',
    module: 'Events',
    method: 'GET',
    path: '/events',
    description: 'List webhook events with pagination and filtering',
    queryParams: [
      { name: 'limit', type: 'number', default: 50 },
      { name: 'cursor', type: 'string' },
      { name: 'status', type: 'enum', options: ['received', 'queued', 'delivered', 'failed', 'dead'] },
      { name: 'source_type', type: 'enum', options: ['stripe', 'github', 'twilio', 'generic'] },
    ],
  },
  {
    id: 'get-event',
    module: 'Events',
    method: 'GET',
    path: '/events/:id',
    description: 'Get details and delivery attempts for a specific event',
    pathParams: [
      { name: 'id', type: 'string', required: true },
    ],
  },
  {
    id: 'replay-event',
    module: 'Events',
    method: 'POST',
    path: '/events/:id/replay',
    description: 'Re-enqueue an event for delivery',
    pathParams: [
      { name: 'id', type: 'string', required: true },
    ],
  },

  // Sources Module
  {
    id: 'list-sources',
    module: 'Sources',
    method: 'GET',
    path: '/events/sources',
    description: 'List all configured webhook sources',
  },
  {
    id: 'create-source',
    module: 'Sources',
    method: 'POST',
    path: '/events/sources',
    description: 'Configure a new webhook source',
    body: {
      slug: 'my-source',
      source_type: 'generic',
      signing_secret: 'whsec_...',
    },
  },
  {
    id: 'delete-source',
    module: 'Sources',
    method: 'DELETE',
    path: '/events/sources/:id',
    description: 'Delete a webhook source',
    pathParams: [
      { name: 'id', type: 'string', required: true },
    ],
  },

  // Destinations Module
  {
    id: 'list-destinations',
    module: 'Destinations',
    method: 'GET',
    path: '/events/destinations',
    description: 'List all webhook destinations',
  },
  {
    id: 'create-destination',
    module: 'Destinations',
    method: 'POST',
    path: '/events/destinations',
    description: 'Configure a new webhook destination',
    body: {
      url: 'https://webhook.site/...',
      label: 'Staging Endpoint',
      timeout_ms: 10000,
    },
  },
  {
    id: 'delete-destination',
    module: 'Destinations',
    method: 'DELETE',
    path: '/events/destinations/:id',
    description: 'Delete a webhook destination',
    pathParams: [
      { name: 'id', type: 'string', required: true },
    ],
  },

  // Metrics Module
  {
    id: 'metrics-summary',
    module: 'Metrics',
    method: 'GET',
    path: '/events/metrics/summary',
    description: 'Get a 24-hour summary of event metrics',
  },

  // Ingest Module
  {
    id: 'ingest-event',
    module: 'Ingest',
    method: 'POST',
    path: '/in/:sourceSlug',
    description: 'Simulate an incoming webhook (bypass signature check for testing)',
    pathParams: [
      { name: 'sourceSlug', type: 'string', required: true },
    ],
    body: {
      event: 'user.created',
      data: {
        id: 'usr_123',
        email: 'test@example.com',
      },
    },
    headers: {
      'Content-Type': 'application/json',
    },
  },

  // Health Module
  {
    id: 'health-check',
    module: 'System',
    method: 'GET',
    path: '/health',
    description: 'Check gateway service health',
  },
];
