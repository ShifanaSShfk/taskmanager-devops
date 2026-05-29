require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

// ── Import metrics FIRST ──────────────────────────────────────────
const { register, metricsMiddleware } = require('./config/metrics');

const app = express();

// ── Security middleware ───────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// ── Request parsing ───────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Logging ───────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Metrics middleware ────────────────────────────────────────────
// MUST be before routes so every request gets timed
app.use(metricsMiddleware);

// ── Routes ────────────────────────────────────────────────────────
const tasksRouter = require('./routes/tasks');
const authRouter  = require('./routes/auth');

app.use('/api/tasks', tasksRouter);
app.use('/api/auth',  authRouter);

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status:    'healthy',
    timestamp: new Date().toISOString(),
    version:   process.env.npm_package_version || '1.0.0',
    uptime:    process.uptime(),
  });
});

// ── Prometheus metrics endpoint ───────────────────────────────────
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// ── Root ──────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'Task Manager API', docs: '/api/docs' });
});

// ── 404 handler ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

module.exports = app;
