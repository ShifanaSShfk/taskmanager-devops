// src/index.js
// This is where the server actually starts.
// Keeping it separate from app.js means our tests
// can import app.js without accidentally starting a server.

const app  = require('./app');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';  // Listen on all interfaces (required for Docker)

const server = app.listen(PORT, HOST, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║   Task Manager API started             ║
  ║   Port:        ${PORT}                    ║
  ║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(15)}║
  ╚════════════════════════════════════════╝
  `);
});

// ── Graceful shutdown ─────────────────────────────────────────────
// When Kubernetes sends SIGTERM (to stop/replace a pod),
// we finish existing requests before shutting down.
// Without this, in-flight requests get dropped.
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  server.close(() => {
    console.log('HTTP server closed. Exiting process.');
    process.exit(0);
  });

  // Force shutdown after 10 seconds if server doesn't close
  setTimeout(() => {
    console.error('Forced shutdown after 10s timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));   // Ctrl+C

module.exports = server;


// src/index.js — updated to load Vault secrets first
const { loadSecrets } = require('./config/vault');
const app = require('./app');

const PORT = process.env.PORT || 3000;

async function startServer() {
  // Load secrets from Vault BEFORE starting the server
  // This ensures DB_PASSWORD, JWT_SECRET etc. are set
  await loadSecrets();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Task Manager API running on port ${PORT}`);
    console.log(`Vault: ${process.env.VAULT_ADDR || 'not configured (using env vars)'}`);
  });

  const gracefulShutdown = (signal) => {
    console.log(`${signal} received. Shutting down...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

  return server;
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});