# @workspace/metrics

Prometheus metrics for API observability using [prom-client](https://github.com/siimon/prom-client).

## Quick Start

```typescript
import { initializeMetrics, recordHttpRequest, getMetricsText } from '@workspace/metrics';

// Initialize at app startup
initializeMetrics({
  prefix: 'myapp_',
  defaultLabels: { app: 'api', env: 'production' }
});

// Record metrics
recordHttpRequest('GET', '/v1/orgs/:orgId/posts', 200, 0.045);

// Expose /metrics endpoint
const metricsText = await getMetricsText();
```

## Available Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_requests_total` | Counter | method, route, status_code | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | method, route, status_code | Request latency distribution |
| `authorization_checks_total` | Counter | resource, action, result | Permission checks by result |
| `cache_operations_total` | Counter | operation, result | Cache hits/misses/errors |
| `db_query_duration_seconds` | Histogram | operation, table | Database query latency |
| `webhook_deliveries_total` | Counter | event_type, status | Webhook delivery attempts |
| `webhook_delivery_duration_seconds` | Histogram | event_type, status | Webhook delivery latency |

## Helper Functions

```typescript
// HTTP requests (called automatically by metrics plugin)
recordHttpRequest(method, route, statusCode, durationSeconds);

// Authorization checks
recordAuthorizationCheck('users', 'read', true);  // allowed
recordAuthorizationCheck('admin', 'delete', false); // denied

// Cache operations
recordCacheOperation('get', true);   // hit
recordCacheOperation('get', false);  // miss
recordCacheError('set');             // error

// Database queries
recordDbQuery('select', 'users', 0.012);

// Webhook deliveries
recordWebhookDelivery('user.created', 'success', 0.234);
```

## Fastify Integration

Use the metrics plugin in `apps/api`:

```typescript
import metricsPlugin from './plugins/metrics';

app.register(metricsPlugin);
```

This automatically:
- Initializes metrics
- Records HTTP request metrics for all routes
- Exposes `GET /metrics` endpoint for Prometheus scraping

## Configuration

```typescript
initializeMetrics({
  // Collect Node.js default metrics (CPU, memory, etc.)
  collectDefaultMetrics: true,

  // Prefix for all metric names
  prefix: 'myapp_',

  // Labels added to all metrics
  defaultLabels: {
    app: 'api',
    env: process.env.NODE_ENV
  },

  // Custom buckets for HTTP duration histogram
  httpDurationBuckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
});
```

## See Also

- [Monitoring Documentation](../../docs/api-guide/06-quality/04-monitoring.md)
- [prom-client](https://github.com/siimon/prom-client)
