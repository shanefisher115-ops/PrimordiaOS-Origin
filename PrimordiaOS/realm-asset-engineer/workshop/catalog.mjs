// The catalog: recipes (rows) plus a few files (thumbnails for kept rows, .glb for approved rows).
//   SupabaseCatalog  Postgres via PostgREST + a private Storage bucket, with the service-role key. Server side
//                    only: the key never leaves this process (the gallery talks to this process, or to
//                    Supabase directly with the anon key under RLS).
//   LocalCatalog     the same interface on disk, for running before Supabase is set up, and for tests.
// Schema: PrimordiaOS/supabase/migrations/*_realm_asset_catalog.sql.
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { within } from './paths.mjs';

export const BUCKET = 'realm-assets';

export const objectPaths = (row) => {
  const base = `${row.genre}/${row.generator}/${row.name}`;
  return { thumb: `${base}.webp`, strip: `${base}.strip.webp`, glb: `${base}.glb` };
};

const sum = (rows, f) => rows.reduce((s, r) => s + (r[f] ?? 0), 0);

function usageOf(assets) {
  return {
    assets: assets.length,
    approved: assets.filter((a) => a.verdict === 'approved').length,
    awaiting_review: assets.filter((a) => a.verdict === 'kept').length,
    with_glb: assets.filter((a) => a.glb_path).length,
    storage_bytes: sum(assets, 'glb_bytes') + sum(assets, 'thumb_bytes') + sum(assets, 'strip_bytes'),
  };
}

// ------------------------------------------------------------------ Supabase

export class SupabaseCatalog {
  constructor({ url, key, bucket = BUCKET, fetchImpl = globalThis.fetch, timeoutMs = 30_000 }) {
    if (!url || !key) throw new Error('SupabaseCatalog needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    this.kind = 'supabase';
    this.url = url.replace(/\/+$/, '');
    this.key = key;
    this.bucket = bucket;
    this.fetch = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  #headers(extra = {}) {
    // New secret keys (sb_secret_...) go in apikey only; legacy service_role JWTs also as the bearer token.
    const h = { apikey: this.key, ...extra };
    if (!this.key.startsWith('sb_')) h.authorization = `Bearer ${this.key}`;
    return h;
  }

  async #call(method, route, { body, headers = {}, raw = false } = {}) {
    const isBytes = body instanceof Uint8Array;
    const res = await this.fetch(`${this.url}${route}`, {
      method,
      headers: this.#headers({ ...(body !== undefined && !isBytes ? { 'content-type': 'application/json' } : {}), ...headers }),
      body: body === undefined ? undefined : isBytes ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`supabase ${method} ${route.split('?')[0]}: HTTP ${res.status} ${text.slice(0, 300)}`);
      err.status = res.status;
      throw err;
    }
    if (raw) return Buffer.from(await res.arrayBuffer());
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  #rest(method, table, query = '', opts = {}) {
    return this.#call(method, `/rest/v1/${table}${query ? `?${query}` : ''}`, opts);
  }

  async init() {
    await this.#rest('GET', 'realm_assets', 'select=id&limit=1');
    return this;
  }

  async insertAsset(row) {
    const [out] = await this.#rest('POST', 'realm_assets', '', { body: row, headers: { prefer: 'return=representation' } });
    return out;
  }

  async updateAsset(id, patch) {
    const [out] = await this.#rest('PATCH', 'realm_assets', `id=eq.${encodeURIComponent(id)}`, { body: patch, headers: { prefer: 'return=representation' } });
    return out ?? null;
  }

  async getAsset(id) {
    const [row] = await this.#rest('GET', 'realm_assets', `select=*&id=eq.${encodeURIComponent(id)}`);
    return row ?? null;
  }

  async listAssets({ genre, verdict, imported, needsGlb, limit = 60, before } = {}) {
    const q = ['select=*', 'order=created_at.desc', `limit=${Math.min(500, limit)}`];
    if (genre) q.push(`genre=eq.${encodeURIComponent(genre)}`);
    if (verdict) q.push(`verdict=eq.${encodeURIComponent(verdict)}`);
    if (imported !== undefined) q.push(`imported_to_unreal=is.${imported ? 'true' : 'false'}`);
    if (needsGlb) q.push('glb_path=not.is.null');
    if (before) q.push(`created_at=lt.${encodeURIComponent(before)}`);
    return this.#rest('GET', 'realm_assets', q.join('&'));
  }

  async descriptors(genre) {
    const out = [];
    for (let offset = 0; ; offset += 1000) {
      const page = await this.#rest('GET', 'realm_assets', `select=name,silhouette,verdict&genre=eq.${encodeURIComponent(genre)}&order=created_at.asc&limit=1000&offset=${offset}`);
      out.push(...page);
      if (page.length < 1000) return out;
    }
  }

  async reviewsSince(cursor, limit = 100) {
    const q = [`select=*`, `order=reviewed_at.asc`, `limit=${limit}`, 'reviewed_at=not.is.null'];
    if (cursor) q.push(`reviewed_at=gt.${encodeURIComponent(cursor)}`);
    return this.#rest('GET', 'realm_assets', q.join('&'));
  }

  async usage() {
    const [u] = await this.#rest('GET', 'realm_asset_usage', 'select=*');
    return u;
  }

  async dbBytes() {
    try { return await this.#call('POST', '/rest/v1/rpc/realm_asset_db_bytes', { body: {} }); } catch { return null; }
  }

  async upload(objectPath, bytes, contentType) {
    await this.#call('POST', `/storage/v1/object/${this.bucket}/${objectPath}`, {
      body: new Uint8Array(bytes), headers: { 'content-type': contentType, 'x-upsert': 'true', 'cache-control': 'max-age=31536000' },
    });
    return { path: objectPath, bytes: bytes.byteLength };
  }

  download(objectPath) {
    return this.#call('GET', `/storage/v1/object/authenticated/${this.bucket}/${objectPath}`, { raw: true });
  }

  async signedUrl(objectPath, expiresIn = 3600) {
    const r = await this.#call('POST', `/storage/v1/object/sign/${this.bucket}/${objectPath}`, { body: { expiresIn } });
    return `${this.url}/storage/v1${r.signedURL ?? r.signedUrl}`;
  }

  async remove(paths) {
    if (paths.length) await this.#call('DELETE', `/storage/v1/object/${this.bucket}`, { body: { prefixes: paths } });
  }

  queuedBriefs(limit = 10) {
    return this.#rest('GET', 'realm_asset_briefs', `select=*&status=eq.queued&order=created_at.asc&limit=${limit}`);
  }

  /** Takes a queued brief (conditional update, so two engineers never both take one). */
  async takeBrief(id) {
    const rows = await this.#rest('PATCH', 'realm_asset_briefs', `id=eq.${encodeURIComponent(id)}&status=eq.queued`, {
      body: { status: 'taken', taken_at: new Date().toISOString() }, headers: { prefer: 'return=representation' },
    });
    return rows[0] ?? null;
  }

  async updateBrief(id, patch) {
    await this.#rest('PATCH', 'realm_asset_briefs', `id=eq.${encodeURIComponent(id)}`, { body: patch });
  }

  async insertBrief(brief) {
    const [out] = await this.#rest('POST', 'realm_asset_briefs', '', { body: brief, headers: { prefer: 'return=representation' } });
    return out;
  }

  listBriefs(limit = 20) {
    return this.#rest('GET', 'realm_asset_briefs', `select=*&order=created_at.desc&limit=${limit}`);
  }
}

// ------------------------------------------------------------------ local

export class LocalCatalog {
  constructor({ dir }) {
    this.kind = 'local';
    this.dir = dir;
    this.file = path.join(dir, 'catalog.json');
    this.blobs = path.join(dir, 'blobs');
    this.db = null;
    this.writing = Promise.resolve();
  }

  async init() {
    await mkdir(this.blobs, { recursive: true });
    try { this.db = JSON.parse(await readFile(this.file, 'utf8')); } catch { this.db = { assets: [], briefs: [] }; }
    return this;
  }

  #save() {
    const snapshot = JSON.stringify(this.db);
    this.writing = this.writing.then(async () => {
      const tmp = `${this.file}.${process.pid}.tmp`;
      await writeFile(tmp, snapshot);
      await rename(tmp, this.file);
    });
    return this.writing;
  }

  async insertAsset(row) {
    if (this.db.assets.some((a) => a.name === row.name || a.mesh_sha256 === row.mesh_sha256)) {
      const err = new Error(`duplicate asset ${row.name}`); err.status = 409; throw err;
    }
    const now = new Date().toISOString();
    const out = {
      id: randomUUID(), created_at: now, updated_at: now, verdict: 'kept', review_note: null, reviewed_at: null, reviewed_by: null,
      lineage: {}, parent_id: null, brief_id: null, thumb_path: null, thumb_bytes: null, strip_path: null, strip_bytes: null,
      glb_path: null, glb_bytes: null, imported_to_unreal: false, unreal_path: null, imported_at: null, flags: [], ...row,
    };
    this.db.assets.push(out);
    await this.#save();
    return structuredClone(out);
  }

  async updateAsset(id, patch) {
    const row = this.db.assets.find((a) => a.id === id);
    if (!row) return null;
    const now = new Date().toISOString();
    if ('verdict' in patch && patch.verdict !== row.verdict && !('reviewed_at' in patch)) row.reviewed_at = now;
    Object.assign(row, patch, { updated_at: now });
    await this.#save();
    return structuredClone(row);
  }

  async getAsset(id) {
    const row = this.db.assets.find((a) => a.id === id);
    return row ? structuredClone(row) : null;
  }

  async listAssets({ genre, verdict, imported, needsGlb, limit = 60, before } = {}) {
    return this.db.assets
      .filter((a) => (!genre || a.genre === genre) && (!verdict || a.verdict === verdict)
        && (imported === undefined || a.imported_to_unreal === imported) && (!needsGlb || a.glb_path)
        && (!before || a.created_at < before))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, limit)
      .map((a) => structuredClone(a));
  }

  async descriptors(genre) {
    return this.db.assets.filter((a) => a.genre === genre).map((a) => ({ name: a.name, silhouette: a.silhouette, verdict: a.verdict }));
  }

  async reviewsSince(cursor, limit = 100) {
    return this.db.assets.filter((a) => a.reviewed_at && (!cursor || a.reviewed_at > cursor))
      .sort((a, b) => (a.reviewed_at < b.reviewed_at ? -1 : 1)).slice(0, limit).map((a) => structuredClone(a));
  }

  async usage() { return usageOf(this.db.assets); }

  async dbBytes() {
    try { return (await stat(this.file)).size; } catch { return 0; }
  }

  async upload(objectPath, bytes) {
    const file = within(this.blobs, objectPath);
    if (!file) throw new Error(`bad object path ${objectPath}`);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
    return { path: objectPath, bytes: bytes.byteLength };
  }

  async download(objectPath) {
    const file = within(this.blobs, objectPath);
    if (!file) throw new Error(`bad object path ${objectPath}`);
    return readFile(file);
  }

  async signedUrl(objectPath) {
    return `local:${objectPath}`;
  }

  async remove(paths) {
    for (const p of paths) { const f = within(this.blobs, p); if (f) await rm(f, { force: true }); }
  }

  async queuedBriefs(limit = 10) {
    return this.db.briefs.filter((b) => b.status === 'queued').slice(0, limit).map((b) => structuredClone(b));
  }

  async takeBrief(id) {
    const b = this.db.briefs.find((x) => x.id === id && x.status === 'queued');
    if (!b) return null;
    Object.assign(b, { status: 'taken', taken_at: new Date().toISOString() });
    await this.#save();
    return structuredClone(b);
  }

  async updateBrief(id, patch) {
    const b = this.db.briefs.find((x) => x.id === id);
    if (b) { Object.assign(b, patch); await this.#save(); }
  }

  async insertBrief(brief) {
    const out = { id: randomUUID(), created_at: new Date().toISOString(), status: 'queued', count: 4, generators: null, notes: null, ...brief };
    this.db.briefs.push(out);
    await this.#save();
    return structuredClone(out);
  }

  async listBriefs(limit = 20) {
    return this.db.briefs.slice(-limit).reverse().map((b) => structuredClone(b));
  }
}
