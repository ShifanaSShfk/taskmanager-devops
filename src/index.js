// src/index.js
// Entry point — starts the HTTP server.
// Kept separate from app.js so tests can import app.js
// without accidentally binding to a port.

const { loadSecrets } = require('./config/vault');
const app = require('./app');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Listen on all interfaces (required for Docker)

async function startServer() {
  // Load secrets from Vault BEFORE the server starts.
  // This ensures DB_PASSWORD, JWT_SECRET, etc. are set in process.env
  // before any route handler runs.
  // Falls back silently to .env values if Vault is not configured.
  await loadSecrets();

  const server = app.listen(PORT, HOST, () => {
    console.log(`
  ╔════════════════════════════════════════╗
  ║   Task Manager API started             ║
  ║   Port:        ${PORT}                    ║
  ║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(15)}║
  ║   Vault:       ${process.env.VAULT_ADDR ? 'connected' : 'using env vars  '}║
  ╚════════════════════════════════════════╝
    `);
  });

  // ── Graceful shutdown ───────────────────────────────────────────
  // Kubernetes sends SIGTERM when it wants to stop or replace a pod.
  // We finish in-flight requests before exiting — without this,
  // active requests get dropped mid-response.
  const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    server.close(() => {
      console.log('HTTP server closed. Exiting process.');
      process.exit(0);
    });

    // Force-kill after 10 s in case open connections stall the close
    setTimeout(() => {
      console.error('Forced shutdown after 10 s timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT')); // Ctrl+C

  return server;
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = { startServer };