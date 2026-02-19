// ═══════════════════════════════════════════════════════════════════════════
// WHEN JUSTICE — EXECUTIVE DASHBOARD BACKEND PROXY
// Simple Node/Express server to proxy Linear API calls (solves CORS + security)
// ═══════════════════════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env for local development
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8')
    .split('\n')
    .filter(line => line && !line.startsWith('#'))
    .forEach(line => {
      const [key, value] = line.split('=');
      if (key) process.env[key.trim()] = value?.trim();
    });
}

const app = express();
const PORT = process.env.PORT || 3001;

// Env var for Linear API key (should be set via Render secrets)
const LINEAR_API_KEY = process.env.LINEAR_API_KEY;

if (!LINEAR_API_KEY) {
  console.warn('⚠ LINEAR_API_KEY not set in environment');
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));  // Serve dashboard.html, ExecutiveDashboard.jsx, etc.

/**
 * POST /api/linear
 * Proxy GraphQL requests to Linear API with proper auth
 * Body: { query: "...", variables?: {} }
 */
app.post('/api/linear', async (req, res) => {
  const { query, variables } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Missing GraphQL query' });
  }

  if (!LINEAR_API_KEY) {
    return res.status(500).json({ error: 'LINEAR_API_KEY not configured on server' });
  }

  try {
    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINEAR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Linear API Error]', response.status, data);
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (err) {
    console.error('[Proxy Error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✓ Dashboard backend running on http://localhost:${PORT}`);
  console.log(`  POST /api/linear — GraphQL proxy to Linear API`);
  console.log(`  GET  /health   — Server status`);
});
