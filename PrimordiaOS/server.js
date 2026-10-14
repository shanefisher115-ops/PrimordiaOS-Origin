const fs = require('fs');
const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const OPERATOR_PASSWORD = process.env.OPERATOR_PASSWORD;
const COOKIE_SECRET = process.env.COOKIE_SECRET || require('crypto').randomBytes(32).toString('hex');

// Database Setup
const db = new sqlite3.Database('./primordia_actions.db', (err) => {
  if (err) {
    console.error('[DB] Failed to connect to SQLite:', err.message);
    process.exit(1);
  }
  console.log('[DB] Connected to durable action store.');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS actions (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

app.use(express.json());
app.use(cookieParser(COOKIE_SECRET));

// Health check / status route
app.get('/', (req, res) => {
  res.json({ ok: true, service: 'primordia', message: 'PrimordiaOS server is running.', status: 'ready', timestamp: new Date().toISOString() });
});

// Action Queue Endpoints
app.get('/actions', (req, res) => {
  db.all(`SELECT * FROM actions ORDER BY created_at DESC LIMIT 100`, [], (err, rows) => {
    if (err) return res.status(500).json({ ok: false, error: err.message });
    res.json({ ok: true, actions: rows });
  });
});

app.post('/actions', (req, res) => {
  const { id, payload } = req.body;
  if (!id || !payload) return res.status(400).json({ ok: false, error: 'Missing id or payload.' });

  const stmt = db.prepare(`INSERT OR REPLACE INTO actions (id, payload, status) VALUES (?, ?, 'PENDING')`);
  stmt.run(id, JSON.stringify(payload), (err) => {
    if (err) return res.status(500).json({ ok: false, error: err.message });
    res.status(201).json({ ok: true, status: 'queued', id });
  });
  stmt.finalize();
});

app.listen(PORT, HOST, () => {
  console.log(`[Primordia Core] Active on http://${HOST}:${PORT}`);
});
