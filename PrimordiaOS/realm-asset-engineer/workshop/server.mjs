// Review gallery server: the gallery's static files plus a small JSON API over the catalog, using the
// service-role key server side (the browser never sees it). Token-gated; listens on the LAN so Shane's phone
// can open it (http://<laptop-ip>:8790/?t=<token>).
//
//   GET  /api/status                   loop counters, usage vs free-tier budget, errors
//   GET  /api/genres                   slot looks + lighting presets for the 3D viewer
//   GET  /api/assets?verdict&genre&limit&before
//   GET  /api/assets/:id               one row
//   GET  /api/assets/:id/thumb|strip   WebP (local cache, else the bucket)
//   GET  /api/assets/:id/glb           the uploaded .glb, or rebuilt from the recipe when not approved yet
//   POST /api/assets/:id/review        { verdict: approved | rejected | kept, note? }
//   GET  /api/briefs · POST /api/briefs { genre, count, notes?, generators? }
import { timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { build, genres, packData } from './forge.mjs';
import { PATHS, within } from './paths.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.png': 'image/png' };
const HEAVY = ['silhouette'];

function send(res, status, body, type = 'application/json', extra = {}) {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...extra });
  res.end(data);
}

async function body(req, limit = 16_384) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > limit) throw Object.assign(new Error('body too large'), { status: 413 }); chunks.push(c); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { throw Object.assign(new Error('invalid JSON'), { status: 400 }); }
}

const slim = (row) => {
  const out = { ...row };
  for (const k of HEAVY) delete out[k];
  out.thumb_url = row.thumb_path ? `/api/assets/${row.id}/thumb` : null;
  out.strip_url = row.strip_path ? `/api/assets/${row.id}/strip` : null;
  out.glb_url = `/api/assets/${row.id}/glb`;
  return out;
};

export function lanUrls(port, token) {
  const urls = [];
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs ?? []) if (a.family === 'IPv4' && !a.internal) urls.push(`http://${a.address}:${port}/?t=${token}`);
  }
  return [`http://localhost:${port}/?t=${token}`, ...urls];
}

export function createGalleryServer({ host, token, env = {} }) {
  const catalog = host.catalog;
  const expected = Buffer.from(token);
  const matches = (s) => { const given = Buffer.from(s ?? ''); return given.length === expected.length && timingSafeEqual(given, expected); };
  // Bearer header (API calls), or the HttpOnly cookie /api/login sets (so <img> and the .glb fetch work too).
  const authed = (req) => {
    const h = req.headers.authorization ?? '';
    if (h.startsWith('Bearer ') && matches(h.slice(7))) return true;
    const cookie = (req.headers.cookie ?? '').split(';').map((c) => c.trim()).find((c) => c.startsWith('rae_token='));
    return !!cookie && matches(decodeURIComponent(cookie.slice('rae_token='.length)));
  };

  async function cached(kind, row) {
    const dir = path.join(PATHS.cache, kind === 'glb' ? 'glb' : 'thumbs');
    const file = path.join(dir, kind === 'glb' ? `${row.name}.glb` : kind === 'strip' ? `${row.name}.strip.webp` : `${row.name}.webp`);
    if (existsSync(file)) return readFile(file);
    const remote = kind === 'glb' ? row.glb_path : kind === 'strip' ? row.strip_path : row.thumb_path;
    if (!remote) return null;
    const bytes = await catalog.download(remote);
    await mkdir(dir, { recursive: true });
    await writeFile(file, bytes);
    return bytes;
  }

  async function staticFile(res, file) {
    if (!file || !existsSync(file)) return send(res, 404, { error: 'not found' });
    const type = TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
    send(res, 200, await readFile(file), type, { 'cache-control': file.startsWith(PATHS.three) ? 'public, max-age=86400' : 'no-cache' });
  }

  async function api(req, res, url) {
    if (!authed(req)) return send(res, 401, { error: 'token required: open the URL with ?t=<token> printed by the workshop' });
    const parts = url.pathname.split('/').filter(Boolean); // ['api', ...]
    const q = url.searchParams;
    if (req.method === 'POST' && parts[1] === 'login') {
      return send(res, 200, { ok: true }, 'application/json', { 'set-cookie': `rae_token=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000` });
    }
    if (req.method === 'GET' && parts[1] === 'status') return send(res, 200, host.status());
    if (req.method === 'GET' && parts[1] === 'genres') {
      return send(res, 200, Object.fromEntries(Object.keys(genres.GENRES).map((g) => {
        const p = packData(g);
        return [g, { id: p.id, title: p.title, version: p.version, slots: p.slots, lightingPreset: p.lightingPreset, unrealFolder: p.unrealFolder, generators: Object.fromEntries(Object.entries(p.generators).map(([k, v]) => [k, { title: v.title, ranges: v.ranges }])) }];
      })));
    }
    if (parts[1] === 'assets' && parts.length === 2 && req.method === 'GET') {
      const rows = await catalog.listAssets({
        verdict: q.get('verdict') || undefined, genre: q.get('genre') || undefined,
        limit: Math.min(200, Number(q.get('limit')) || 48), before: q.get('before') || undefined,
      });
      return send(res, 200, rows.map(slim));
    }
    if (parts[1] === 'assets' && parts[2]) {
      const row = await catalog.getAsset(parts[2]);
      if (!row) return send(res, 404, { error: 'no such asset' });
      if (req.method === 'GET' && parts.length === 3) return send(res, 200, slim(row));
      if (req.method === 'GET' && (parts[3] === 'thumb' || parts[3] === 'strip')) {
        const bytes = await cached(parts[3], row);
        return bytes ? send(res, 200, bytes, 'image/webp', { 'cache-control': 'private, max-age=86400' }) : send(res, 404, { error: 'no thumbnail' });
      }
      if (req.method === 'GET' && parts[3] === 'glb') {
        if (row.glb_path) return send(res, 200, await cached('glb', row), 'model/gltf-binary', { 'cache-control': 'private, max-age=86400' });
        const b = build({ genre: row.genre, generator: row.generator, params: row.params });
        if (!b.ok) return send(res, 500, { error: b.error });
        return send(res, 200, b.glb, 'model/gltf-binary', { 'x-regenerated': 'true', 'x-sha-match': String(b.sha === row.mesh_sha256) });
      }
      if (req.method === 'POST' && parts[3] === 'review') {
        const { verdict, note } = await body(req);
        if (!['approved', 'rejected', 'kept'].includes(verdict)) return send(res, 400, { error: 'verdict must be approved, rejected or kept' });
        const updated = await catalog.updateAsset(row.id, { verdict, review_note: note ? String(note).slice(0, 500) : null, reviewed_by: 'gallery' });
        host.lastPoll = 0; // the engineer picks the review up on its next tick
        return send(res, 200, slim(updated));
      }
    }
    if (parts[1] === 'briefs' && req.method === 'GET') return send(res, 200, await catalog.listBriefs(20));
    if (parts[1] === 'briefs' && req.method === 'POST') {
      const b = await body(req);
      if (!genres.GENRES[b.genre]) return send(res, 400, { error: `genre must be one of ${Object.keys(genres.GENRES).join(', ')}` });
      const count = Math.max(1, Math.min(50, Math.floor(Number(b.count) || 4)));
      const kinds = Array.isArray(b.generators) ? b.generators.filter((k) => genres.GENRES[b.genre].generators[k]) : null;
      const brief = await catalog.insertBrief({ genre: b.genre, count, notes: b.notes ? String(b.notes).slice(0, 500) : null, generators: kinds?.length ? kinds : null, created_by: 'gallery' });
      host.lastPoll = 0;
      return send(res, 201, brief);
    }
    return send(res, 404, { error: 'no such route' });
  }

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://gallery');
    try {
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      if (req.method !== 'GET') return send(res, 405, { error: 'GET only' });
      if (url.pathname === '/' || url.pathname === '/index.html') return await staticFile(res, path.join(PATHS.gallery, 'index.html'));
      if (url.pathname === '/config.js') {
        // Direct-Supabase mode needs only the public anon key; api mode needs nothing.
        const cfg = { mode: 'api', supabaseUrl: env.SUPABASE_URL ?? null, anonKey: env.SUPABASE_ANON_KEY || null };
        return send(res, 200, `window.RAE_CONFIG = ${JSON.stringify(cfg)};\n`, TYPES['.js']);
      }
      if (url.pathname.startsWith('/gallery/')) return await staticFile(res, within(PATHS.gallery, url.pathname.slice(9)));
      if (url.pathname === '/preview/stage.js') return await staticFile(res, path.join(PATHS.preview, 'stage.js'));
      if (url.pathname.startsWith('/vendor/three/build/') || url.pathname.startsWith('/vendor/three/examples/jsm/')) {
        return await staticFile(res, within(PATHS.three, url.pathname.slice('/vendor/three/'.length)));
      }
      return send(res, 404, { error: 'not found' });
    } catch (e) {
      host.error?.(`gallery ${req.method} ${url.pathname}: ${e.message}`);
      return send(res, e.status ?? 500, { error: e.message });
    }
  });
}
