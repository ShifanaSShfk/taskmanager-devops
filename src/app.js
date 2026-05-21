// src/app.js
// This file sets up Express and all middleware.
// It exports the app WITHOUT starting the server,
// so tests can import it without binding to a port.

require('dotenv').config();   // Load .env file into process.env

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

const app = express();

// ── Security middleware ──────────────────────────────────────────
// helmet sets secure HTTP headers (XSS protection, no sniff, etc.)
app.use(helmet());

// cors allows browsers from other origins to call this API
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// ── Request parsing ──────────────────────────────────────────────
app.use(express.json());                       // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse form bodies

// ── Logging ──────────────────────────────────────────────────────
// morgan logs every HTTP request: method, path, status, response time
// In production, swap 'dev' for 'combined' (standard Apache format)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Routes ───────────────────────────────────────────────────────
const tasksRouter = require('./routes/tasks');
const authRouter  = require('./routes/auth');

app.use('/api/tasks', tasksRouter);
app.use('/api/auth',  authRouter);

// ── Health check ─────────────────────────────────────────────────
// Kubernetes will call this endpoint to know if the app is alive.
// If it returns non-200, K8s restarts the container automatically.
app.get('/health', (req, res) => {
  res.status(200).json({
    status:    'healthy',
    timestamp: new Date().toISOString(),
    version:   process.env.npm_package_version || '1.0.0',
    uptime:    process.uptime(),
  });
});

// ── Root ─────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'Task Manager API', docs: '/api/docs' });
});

// ── 404 handler ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Global error handler ─────────────────────────────────────────
// Express calls this when next(error) is called anywhere
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error:   process.env.NODE_ENV === 'production'
               ? 'Internal server error'
               : err.message,
  });
});

module.exports = app;