// Docker (local) realm service wrapper — the agent HTTP contract shared with the Cloudflare Worker:
//
//   POST /inbox          { events: [...] } | [...] | {...}   queue events (depth + duplicate checks)
//   POST /outbox/drain                                     return and clear outbox
//   POST /run                                              run one loop now
//   GET  /status                                           name, version, counts, memory summary (no auth)
//   GET  /inbox, GET /outbox                               read-only views
//
// Env: AGENT_PORT (8080)  AGENT_HOST (0.0.0.0)  PRIMORDIA_REALM (local)
//      AUTORUN ("1" = run a loop after each accepted delivery)  PRIMORDIA_TOKEN (bearer, optional)
// agent.js is imported unchanged; all I/O stays here and in folder.js.
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as agent from '../agent.js';
import { FILES, folderIO, loadManifest, withFolderLock, runFolderLoop } from './folder.js';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const manifest = await loadManifest(root);
const realm = process.env.PRIMORDIA_REALM || 'local';
const io = folderIO(root, manifest, realm);
const token = process.env.PRIMORDIA_TOKEN || '';
const autorun = process.env.AUTORUN === '1';

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body) + '\n');
};

function authorized(req) {
  if (!token) return true;
  const got = Buffer.from(String(req.headers.authorization || ''));
  const want = Buffer.from(`Bearer ${token}`);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

async function body(req) {
  let text = '';
  for await (const c of req) { text += c; if (text.length > 1024 * 1024) throw Object.assign(new Error('body too large'), { status: 413 }); }
  try { return text ? JSON.parse(text) : {}; } catch { throw Object.assign(new Error('invalid JSON'), { status: 400 }); }
}

// Serialize loops: one at a time, latest request coalesces into the next run.
let running = Promise.resolve();
function runOnce() {
  running = running.then(() => runFolderLoop(root, agent)).catch((e) => { io.log(`LOOP failed: ${e.message}`); throw e; });
  return running;
}

async function handle(req, res) {
  const { pathname } = new URL(req.url, 'http://agent');
  if (req.method === 'GET' && pathname === '/status') {
    const [inbox, outbox, memory] = await Promise.all([io.read('inbox', []), io.read('outbox', []), io.read('memory', {})]);
    return json(res, 200, {
      ok: true, name: manifest.name, version: manifest.version, realm,
      capabilities: manifest.capabilities, inbox: inbox.length, outbox: outbox.length,
      memory: { loops: memory.loops ?? 0, last_run: memory.last_run ?? null },
    });
  }
  if (!authorized(req)) return json(res, 401, { ok: false, status: 'rejected', code: 'UNAUTHORIZED' });

  if (req.method === 'POST' && pathname === '/inbox') {
    const b = await body(req);
    const incoming = Array.isArray(b) ? b : Array.isArray(b.events) ? b.events : [b];
    const max = manifest.safety?.max_loop_depth ?? 5;
    const result = await withFolderLock(root, async () => {
      const inbox = await io.read('inbox', []);
      const memory = await io.read('memory', {});
      const known = new Set([...(memory._seen_event_ids ?? []), ...inbox.map((e) => e.id)]);
      const queued = []; const drops = []; let duplicates = 0;
      for (const e of incoming) {
        if (!e || typeof e !== 'object' || typeof e.type !== 'string') { drops.push({ id: e?.id, code: 'INVALID_ENVELOPE' }); continue; }
        if (Number.isInteger(e.depth) && e.depth >= max) { drops.push({ id: e.id, code: 'DEPTH_EXCEEDED', depth: e.depth, max_loop_depth: max }); continue; }
        if (e.id && known.has(e.id)) { duplicates++; continue; }
        if (e.id) known.add(e.id);
        queued.push(e);
      }
      await io.write('inbox', inbox.concat(queued));
      return { queued: queued.length, dropped: drops.length, drops, duplicates };
    });
    for (const d of result.drops) io.log(`DROP ${d.id}: ${d.code}`);
    if (autorun && result.queued > 0) runOnce().catch(() => {});
    return json(res, 200, { ok: true, status: result.queued ? 'queued' : result.duplicates ? 'duplicate' : 'dropped', ...result });
  }
  if (req.method === 'POST' && pathname === '/outbox/drain') {
    const actions = await withFolderLock(root, async () => {
      const a = await io.read('outbox', []);
      await io.write('outbox', []);
      return a;
    });
    return json(res, 200, { ok: true, status: 'drained', actions });
  }
  if (req.method === 'POST' && pathname === '/run') {
    const out = await runOnce();
    return json(res, 200, { ok: true, status: 'ran', processed: out.processed, actions: out.actions });
  }
  if (req.method === 'GET' && (pathname === '/inbox' || pathname === '/outbox')) {
    return json(res, 200, { ok: true, [pathname.slice(1)]: await io.read(pathname.slice(1), []) });
  }
  return json(res, 404, { ok: false, code: 'NOT_FOUND' });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => json(res, e.status || 500, { ok: false, code: e.status ? 'BAD_REQUEST' : 'INTERNAL', message: e.message }));
});
const port = Number(process.env.AGENT_PORT || 8080);
server.listen(port, process.env.AGENT_HOST || '0.0.0.0', () => {
  io.log(`HTTP listening on :${server.address().port} (autorun=${autorun}, auth=${Boolean(token)}) files=${Object.values(FILES).join(',')}`);
});
const stop = () => server.close(() => process.exit(0));
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
