// src/config/vault.js
// Reads secrets from HashiCorp Vault at startup.
// In development (no Vault), falls back to environment variables.

const https = require('https');

const VAULT_ADDR  = process.env.VAULT_ADDR  || 'http://localhost:8200';
const VAULT_TOKEN = process.env.VAULT_TOKEN || '';

async function getSecret(path) {
  // If no Vault token, fall back to environment variables (local dev)
  if (!VAULT_TOKEN) {
    console.log(`[Vault] No token configured — using env vars for ${path}`);
    return null;
  }

  return new Promise((resolve, reject) => {
    const url = `${VAULT_ADDR}/v1/${path}`;
    const options = {
      headers: { 'X-Vault-Token': VAULT_TOKEN },
    };

    const req = require(url.startsWith('https') ? 'https' : 'http')
      .get(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`Vault returned ${res.statusCode} for ${path}`));
            return;
          }
          const parsed = JSON.parse(data);
          resolve(parsed.data.data);  // KV v2 nests data under data.data
        });
      });

    req.on('error', reject);
    req.end();
  });
}

async function loadSecrets() {
  try {
    const [dbSecrets, appSecrets] = await Promise.all([
      getSecret('secret/data/taskmanager/db'),
      getSecret('secret/data/taskmanager/app'),
    ]);

    // Vault secrets override environment variables
    if (dbSecrets) {
      process.env.DB_PASSWORD = dbSecrets.password;
      process.env.DB_USER     = dbSecrets.username;
      process.env.DB_HOST     = dbSecrets.host;
      console.log('[Vault] Database secrets loaded');
    }

    if (appSecrets) {
      process.env.JWT_SECRET = appSecrets.jwt_secret;
      console.log('[Vault] Application secrets loaded');
    }

  } catch (err) {
    console.error('[Vault] Failed to load secrets:', err.message);
    console.log('[Vault] Falling back to environment variables');
    // Don't crash — fall back to .env file
  }
}

module.exports = { loadSecrets };