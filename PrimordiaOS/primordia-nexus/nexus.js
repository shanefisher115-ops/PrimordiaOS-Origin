// nexus.js — Primordia Nexus (Power Edition)
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cors = require('cors');

// Dynamic import-friendly fetch for CommonJS
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const app = express();
const ROOT = path.join(__dirname);

// Auto‑fallback port logic
function choosePort(defaultPort) {
  return new Promise((resolve) => {
    const net = require('net');
    const tester = net.createServer()
      .once('error', () => resolve(defaultPort + 1))
      .once('listening', () => tester.close(() => resolve(defaultPort)))
      .listen(defaultPort);
  });
}

(async () => {
  const PORT = await choosePort(process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

  // Middlewares
  app.use(helmet());
  app.use(compression());
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('combined'));

  // Serve canvas-universe
  const staticPath = path.join(ROOT, 'canvas-universe');
  app.use(express.static(staticPath, { index: 'index.html', maxAge: '1h' }));

  // Health
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), ts: Date.now(), port: PORT });
  });

  // Root
  app.get('/', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });

  // MCP proxy route (Nexus → MCP stub)
  app.post('/mcp/command', async (req, res) => {
    try {
      const mcpUrl = process.env.MCP_URL || 'http://localhost:3456/mcp/command';

      console.log('Nexus → MCP:', req.body);

      const response = await fetch(mcpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });

      const json = await response.json();
      res.status(response.status).json({
        status: 'ok',
        proxied: true,
        mcp: json
      });
    } catch (err) {
      console.error('MCP proxy failure:', err);
      res.status(502).json({ error: 'mcp_proxy_failed', message: err.message });
    }
  });

  // Browser realm info
  app.get('/browser-realm/info', (req, res) => {
    res.json({ realm: 'browser-realm', version: 'power', ts: Date.now() });
  });

  // 404
  app.use((req, res) => {
    res.status(404).send('Not found');
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'internal_server_error' });
  });

  // Start server
  const server = app.listen(PORT, () => {
    console.log(`⚡ Primordia Nexus (Power Edition) online at http://localhost:${PORT}`);
  });

  // Graceful shutdown
  function shutdown(signal) {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('Forced shutdown.');
      process.exit(1);
    }, 10000);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
})();
