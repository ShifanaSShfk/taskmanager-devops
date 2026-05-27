// src/config/metrics.js
// Exposes application metrics in Prometheus format.
// Prometheus scrapes the /metrics endpoint every 15 seconds.

const promClient = require('prom-client');

// ── Default metrics ────────────────────────────────────────────────
// Automatically collects Node.js runtime metrics:
// - process CPU usage
// - heap memory (used, total, external)
// - event loop lag
// - garbage collection stats
// - active handles and requests
const register = new promClient.Registry();
promClient.collectDefaultMetrics({
  register,
  prefix: 'taskmanager_',    // All default metrics get this prefix
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// ── Custom metrics ─────────────────────────────────────────────────

// Counter — only goes up. Total requests received.
// Labels let you slice by method, route, status code.
const httpRequestsTotal = new promClient.Counter({
  name: 'taskmanager_http_requests_total',
  help: 'Total number of HTTP requests received',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Histogram — tracks distribution of values with configurable buckets.
// Perfect for response times — lets you calculate p50, p95, p99.
const httpRequestDuration = new promClient.Histogram({
  name: 'taskmanager_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  // Buckets in seconds — tune these to your expected response times
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

// Gauge — goes up AND down. Current active requests.
const httpRequestsInFlight = new promClient.Gauge({
  name: 'taskmanager_http_requests_in_flight',
  help: 'Number of HTTP requests currently being processed',
  registers: [register],
});

// Counter for task operations — business-level metric
const taskOperationsTotal = new promClient.Counter({
  name: 'taskmanager_task_operations_total',
  help: 'Total task CRUD operations',
  labelNames: ['operation', 'status'],   // operation: create/read/update/delete
  registers: [register],
});

// Gauge for total tasks in the system
const tasksGauge = new promClient.Gauge({
  name: 'taskmanager_tasks_total',
  help: 'Current total number of tasks in the system',
  labelNames: ['status', 'priority'],
  registers: [register],
});

// ── Middleware ─────────────────────────────────────────────────────
// Express middleware that automatically records metrics for every request
function metricsMiddleware(req, res, next) {
  // Skip recording metrics for the /metrics endpoint itself
  if (req.path === '/metrics') return next();

  const startTime = process.hrtime.bigint();
  httpRequestsInFlight.inc();

  // Record metrics when the response finishes
  res.on('finish', () => {
    const durationSeconds = Number(process.hrtime.bigint() - startTime) / 1e9;

    const labels = {
      method:      req.method,
      route:       req.route?.path || req.path,
      status_code: res.statusCode.toString(),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, durationSeconds);
    httpRequestsInFlight.dec();
  });

  next();
}

module.exports = {
  register,
  metricsMiddleware,
  taskOperationsTotal,
  tasksGauge,
};