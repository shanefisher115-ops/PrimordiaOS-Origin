// agentWorker.js — Realm worker body

const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const https = require('https');

const { realmId, policy } = workerData;

function safePath(p) {
  const norm = path.normalize(p);
  const allowed = policy.allowedPaths || [];
  for (const base of allowed) {
    const nb = path.normalize(base);
    if (norm.startsWith(nb)) return norm;
  }
  throw new Error(`Path not allowed: ${p}`);
}

function safeHost(host) {
  const allowed = policy.allowedHosts || [];
  if (!allowed.includes(host)) {
    throw new Error(`Host not allowed: ${host}`);
  }
  return host;
}

async function handle(action, payload) {
  if (action === 'fs.read') {
    if (!policy.allowFS) throw new Error('FS not allowed');
    const p = safePath(payload.path);
    return fs.readFileSync(p, 'utf8');
  }

  if (action === 'fs.write') {
    if (!policy.allowFS) throw new Error('FS not allowed');
    const p = safePath(payload.path);
    fs.writeFileSync(p, payload.content || '', 'utf8');
    return { ok: true };
  }

  if (action === 'http.get') {
    if (!policy.allowHTTP) throw new Error('HTTP not allowed');
    const url = new URL(payload.url);
    safeHost(url.hostname);
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }).on('error', reject);
    });
  }

  return { ok: false, error: 'Unknown action' };
}

parentPort.on('message', async (msg) => {
  try {
    const result = await handle(msg.action, msg.payload);
    parentPort.postMessage({ type: 'result', data: result });
  } catch (e) {
    parentPort.postMessage({ type: 'result', data: { ok: false, error: String(e) } });
  }
});
