// The workshop host: runs the RealmAssetEngineer agent 24/7 and serves the tool capabilities its actions
// target. It plays the kernel's dev-realm dispatcher for this one agent: events go into the agent's inbox
// under inbox/.lock, one folder loop runs, the outbox is drained, and each action is executed here:
//   capability:forge    -> job queue (rate limited): kernel build, mechanical checks, silhouette + variety,
//                          WebGL preview, optional vision score  -> "built" result event
//   capability:catalog  -> keep (row + thumbnails) / discard / publish (.glb for approved)  -> result event
//   kernel              -> brief bookkeeping
// Events are delivered in batches of equal depth, so a loop that mixes a fresh brief with a deep result
// never inflates the brief's hop count.
import { appendFile, copyFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { LocalCatalog, SupabaseCatalog, objectPaths } from './catalog.mjs';
import { build, genres, kernelInfo, packData } from './forge.mjs';
import { steerBrief, visionScore } from './ollama.mjs';
import { PATHS } from './paths.mjs';
import { Previewer } from './preview.mjs';
import { silhouette, variety } from './silhouette.mjs';
import { freeRamGB, unrealRunning } from './system.mjs';

const AGENT_FILES = ['agent.json', 'agent.js', 'README.md', 'runtime/core.js', 'runtime/folder.js', 'runtime/http.js',
  'runtime/worker.js', 'runtime/Dockerfile', 'runtime/wrangler.toml', 'runtime/dev.vars.example'];
const REVIEWED_LIMIT = 5000;
const safeId = (id) => id.replace(/[^A-Za-z0-9_.-]/g, '_');
const isUuid = (s) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** Style data for the agent: what it may sample, nothing it doesn't need. */
export function styleFor(genre) {
  const p = packData(genre);
  return {
    version: p.version,
    assetPrefix: p.assetPrefix,
    generators: Object.fromEntries(Object.entries(p.generators).map(([k, g]) => [k, {
      weight: g.weight, ranges: g.ranges, fixed: g.fixed ?? {}, integer: g.integer, triangleBudget: g.triangleBudget, maxSize: g.maxSize, title: g.title,
    }])),
  };
}

export async function openCatalog(env, { log = () => {} } = {}) {
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const c = new SupabaseCatalog({ url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_ROLE_KEY });
    await c.init();
    log(`catalog: Supabase ${new URL(env.SUPABASE_URL).host}`);
    return c;
  }
  log(`catalog: local (${PATHS.localCatalog}); add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to ${PATHS.envFile} for Supabase`);
  return new LocalCatalog({ dir: PATHS.localCatalog }).init();
}

export class Host {
  constructor({ config, env, catalog, previewer, log }) {
    this.config = config;
    this.env = env;
    this.catalog = catalog;
    this.previewer = previewer ?? (config.previewer.enabled ? new Previewer({ browserPath: config.previewer.browserPath, log: (m) => this.log(m) }) : null);
    this.logLine = log ?? ((line) => process.stdout.write(line + '\n'));
    this.state = null;
    this.descriptors = new Map(); // genre -> [{ name, silhouette }]
    this.usage = null;
    this.lastPoll = 0;
    this.visionTimes = [];
    this.stopping = false;
    this.errors = [];
  }

  log(msg) {
    const line = `${new Date().toISOString()} ${msg}`;
    this.logLine(line);
    appendFile(path.join(PATHS.logs, 'workshop.log'), line + '\n').catch(() => {});
  }

  // ---------------------------------------------------------------- setup

  /** Installs (or updates) the agent container in the data folder, keeping its state, like `primordia update`. */
  async installAgent() {
    for (const dir of ['runtime', 'state', 'inbox', 'outbox', 'logs']) await mkdir(path.join(PATHS.agent, dir), { recursive: true });
    for (const f of AGENT_FILES) {
      const src = path.join(PATHS.agentSource, f), dst = path.join(PATHS.agent, f);
      const [a, b] = await Promise.all([readFile(src), readFile(dst).catch(() => null)]);
      if (!b || !a.equals(b)) await copyFile(src, dst);
    }
    for (const [f, empty] of [['state/memory.json', '{}'], ['state/context.json', '{}'], ['inbox/events.json', '[]'], ['outbox/actions.json', '[]']]) {
      if (!existsSync(path.join(PATHS.agent, f))) await writeFile(path.join(PATHS.agent, f), empty + '\n');
    }
    this.folder = await import(pathToFileURL(path.join(PATHS.agent, 'runtime', 'folder.js')).href);
    this.manifest = JSON.parse(await readFile(path.join(PATHS.agent, 'agent.json'), 'utf8'));
  }

  async start() {
    for (const d of [PATHS.data, PATHS.cache, PATHS.logs]) await mkdir(d, { recursive: true });
    await this.installAgent();
    try { this.state = JSON.parse(await readFile(PATHS.hostState, 'utf8')); } catch { this.state = {}; }
    this.state = {
      reviewCursor: null, reviewed: {}, rotation: 0, tokens: 1, tokensAt: Date.now(), lastJobAt: 0,
      jobs: [], deliveries: [], counters: { jobs: 0, built: 0, failed: 0, kept: 0, discarded: 0, published: 0, loops: 0 },
      ...this.state, startedAt: new Date().toISOString(),
    };
    this.kernel = kernelInfo();
    this.log(`host: agent ${this.manifest.name}@${this.manifest.version} in ${PATHS.agent}; kernel ${this.kernel.commit.slice(0, 8)}${this.kernel.dirty ? ' (local edits)' : ''}, manifold-3d ${this.kernel.manifold}; genres ${Object.keys(genres.GENRES).join(', ')}`);
    if (this.kernel.dirty) this.log('host: Primordia-cad has uncommitted edits; rows record kernel_dirty = true');
    if (this.previewer && !this.previewer.available) { this.log('host: no Chrome/Edge found, previews off'); this.previewer = null; }
    await this.refreshUsage();
    return this;
  }

  async saveState() {
    const tmp = `${PATHS.hostState}.tmp`;
    await writeFile(tmp, JSON.stringify(this.state, null, 1));
    await rename(tmp, PATHS.hostState);
  }

  async stop() {
    this.stopping = true;
    await this.saveState().catch(() => {});
    await this.previewer?.stop();
  }

  // ---------------------------------------------------------------- the loop

  /** One step: poll (briefs, reviews, usage) when due, deliver one batch of events, run at most one forge job. */
  async tick({ forcePoll = false } = {}) {
    const did = { polled: false, delivered: 0, job: null };
    try {
      if (forcePoll || Date.now() - this.lastPoll > this.config.pollSeconds * 1000) { await this.poll(); did.polled = true; }
      did.delivered = await this.deliver();
      if (!did.delivered) did.job = await this.runJob();
      if (!did.delivered && !did.job) await this.maybeStanding();
    } catch (e) {
      this.error(`tick: ${e.stack ?? e.message}`);
    }
    await this.saveState().catch((e) => this.error(`state: ${e.message}`));
    return did;
  }

  error(msg) {
    this.log(`ERROR ${msg}`);
    this.errors.push({ at: new Date().toISOString(), msg: msg.split('\n')[0] });
    this.errors = this.errors.slice(-20);
  }

  async run() {
    this.log(`host: running (${this.config.rate.candidatesPerHour} candidates/h max, tick ${this.config.tickSeconds} s)`);
    while (!this.stopping) {
      const did = await this.tick();
      const busy = did.delivered || did.job;
      await new Promise((r) => setTimeout(r, busy ? 200 : this.config.tickSeconds * 1000));
    }
  }

  push(event) { this.state.deliveries.push(event); }

  // ---------------------------------------------------------------- polling

  async refreshUsage() {
    try {
      const u = await this.catalog.usage();
      this.usage = { ...u, budget_bytes: this.config.storage.budgetBytes, db_bytes: await this.catalog.dbBytes() };
    } catch (e) { this.error(`usage: ${e.message}`); }
    return this.usage;
  }

  async poll() {
    this.lastPoll = Date.now();
    await this.refreshUsage();
    // Briefs Shane queued (gallery or CLI).
    for (const b of await this.catalog.queuedBriefs(5)) {
      const taken = await this.catalog.takeBrief(b.id);
      if (!taken) continue;
      if (!genres.GENRES[b.genre]) {
        await this.catalog.updateBrief(b.id, { status: 'cancelled', done_at: new Date().toISOString() });
        this.log(`brief ${b.id}: unknown genre "${b.genre}", cancelled`);
        continue;
      }
      await this.queueBrief({ brief_id: b.id, genre: b.genre, count: b.count, generators: b.generators ?? undefined, notes: b.notes ?? undefined });
    }
    // Shane's reviews, once each (the agent learns from them).
    const rows = await this.catalog.reviewsSince(this.state.reviewCursor);
    for (const row of rows) {
      this.state.reviewCursor = row.reviewed_at;
      const previous = this.state.reviewed[row.id] ?? 'kept';
      if (previous === row.verdict) continue;
      const style = genres.GENRES[row.genre]?.generators[row.generator];
      this.push({
        id: `review-${row.id}-${row.verdict}-${row.reviewed_at}`, type: 'signal', depth: 0, origin: 'user',
        payload: { op: 'review', asset_id: row.id, name: row.name, genre: row.genre, generator: row.generator, params: row.params, ranges: style?.ranges ?? {}, verdict: row.verdict, previous, has_glb: !!row.glb_path },
      });
      this.state.reviewed[row.id] = row.verdict;
      this.log(`review: ${row.name} ${previous} -> ${row.verdict}${row.review_note ? ` ("${row.review_note}")` : ''}`);
    }
    const ids = Object.keys(this.state.reviewed);
    if (ids.length > REVIEWED_LIMIT) for (const id of ids.slice(0, ids.length - REVIEWED_LIMIT)) delete this.state.reviewed[id];
    // Approved rows still without a .glb (a publish that failed earlier): retry a few.
    const missing = (await this.catalog.listAssets({ verdict: 'approved', limit: 20 }))
      .filter((r) => !r.glb_path && !r.flags?.some((f) => f.startsWith('regen-mismatch') || f.startsWith('no-glb')) && this.state.reviewed[r.id] === 'approved');
    for (const r of missing.slice(0, 2)) await this.publish({ asset_id: r.id }).catch((e) => this.error(`publish retry ${r.name}: ${e.message}`));
    await this.cleanCache().catch(() => {});
  }

  async queueBrief({ brief_id, genre, count, generators, notes }) {
    const style = styleFor(genre);
    const steer = notes ? await steerBrief({ notes, genre, style, config: this.config, log: (m) => this.log(m) }) : undefined;
    this.push({ id: `brief-${brief_id}`, type: 'task', depth: 0, origin: 'scheduler', payload: { op: 'brief', brief_id, genre, count, generators, notes, steer, style } });
    this.log(`brief ${brief_id}: ${count} x ${genre}${generators?.length ? ` (${generators.join(', ')})` : ''}${notes ? ` "${notes}"` : ''}${steer?.understood?.length ? ` understood: ${steer.understood.join(', ')}` : ''}`);
  }

  /** With nothing queued, the engineer gives itself a small brief, rotating through the genres. */
  async maybeStanding() {
    const s = this.config.standing;
    if (!s.enabled || this.state.jobs.length || this.state.deliveries.length) return false;
    if (this.backlogFull()) return false; // Shane has enough to review; don't build more to discard
    if (this.tokens() < 1) return false;
    const list = (s.genres ?? Object.keys(genres.GENRES)).filter((g) => genres.GENRES[g]);
    if (!list.length) return false;
    const genre = list[this.state.rotation++ % list.length];
    await this.queueBrief({ brief_id: `standing-${genre}-${Date.now().toString(36)}`, genre, count: s.count });
    return true;
  }

  backlogFull() {
    return (this.usage?.awaiting_review ?? 0) >= this.config.review.maxAwaitingReview;
  }

  // ---------------------------------------------------------------- rate limit

  async rateFactor() {
    let f = 1;
    if (await unrealRunning()) f *= this.config.rate.slowWhileUnreal;
    if (this.backlogFull()) f *= this.config.rate.slowWhenBacklogFull;
    return f;
  }

  tokens() {
    const perSec = this.config.rate.candidatesPerHour / 3600 * (this.factor ?? 1);
    const cap = Math.max(1, Math.ceil(this.config.rate.candidatesPerHour / 12));
    const now = Date.now();
    this.state.tokens = Math.min(cap, this.state.tokens + ((now - this.state.tokensAt) / 1000) * perSec);
    this.state.tokensAt = now;
    return this.state.tokens;
  }

  // ---------------------------------------------------------------- agent loop

  async deliver() {
    const pending = this.state.deliveries;
    if (!pending.length) return 0;
    const depth = Math.min(...pending.map((e) => e.depth ?? 0));
    const batch = pending.filter((e) => (e.depth ?? 0) === depth);
    this.state.deliveries = pending.filter((e) => (e.depth ?? 0) !== depth);
    const now = new Date().toISOString();
    await this.folder.withFolderLock(PATHS.agent, async () => {
      const file = path.join(PATHS.agent, 'inbox', 'events.json');
      let inbox = [];
      try { inbox = JSON.parse(await readFile(file, 'utf8')); } catch { /* empty */ }
      inbox.push(...batch.map((e) => ({ origin: 'kernel', target: this.manifest.name, timestamp: now, ...e })));
      await writeFile(file, JSON.stringify(inbox, null, 1));
    });
    await this.folder.runFolderLoop(PATHS.agent, undefined, { quiet: true });
    this.state.counters.loops++;
    const actions = await this.folder.withFolderLock(PATHS.agent, async () => {
      const file = path.join(PATHS.agent, 'outbox', 'actions.json');
      let out = [];
      try { out = JSON.parse(await readFile(file, 'utf8')); } catch { /* empty */ }
      await writeFile(file, '[]\n');
      return out;
    });
    for (const a of actions) await this.dispatch(a).catch((e) => this.error(`dispatch ${a.target} ${a.payload?.op}: ${e.stack ?? e.message}`));
    return batch.length;
  }

  async dispatch(a) {
    const op = a.payload?.op;
    if (a.target === 'capability:forge' && op === 'build') {
      this.state.jobs.push({ action_id: a.id, depth: a.depth, candidate: a.payload.candidate });
    } else if (a.target === 'capability:catalog') {
      const result = op === 'keep' ? await this.keep(a.payload) : op === 'discard' ? await this.discard(a.payload) : op === 'publish' ? await this.publish(a.payload) : null;
      if (result) this.push({ id: `${a.id}-r`, type: 'result', depth: a.depth, origin: 'kernel', payload: result });
    } else if (a.target === 'kernel') {
      if (op === 'brief_planned' && isUuid(a.payload.brief_id)) {
        await this.catalog.updateBrief(a.payload.brief_id, { status: 'done', done_at: new Date().toISOString() }).catch((e) => this.error(`brief: ${e.message}`));
      }
    } else {
      this.log(`no route for ${a.type} -> ${a.target} (${op ?? '-'})`);
    }
  }

  // ---------------------------------------------------------------- forge

  async descriptorsFor(genre) {
    if (!this.descriptors.has(genre)) this.descriptors.set(genre, await this.catalog.descriptors(genre));
    return this.descriptors.get(genre);
  }

  async runJob() {
    if (!this.state.jobs.length) return null;
    this.factor = await this.rateFactor();
    if (Date.now() - this.state.lastJobAt < this.config.rate.minGapSeconds * 1000 / Math.max(this.factor, 0.05)) return null;
    if (this.tokens() < 1) return null;
    this.state.tokens -= 1;
    this.state.lastJobAt = Date.now();
    const job = this.state.jobs.shift();
    const result = await this.forge(job.candidate);
    this.push({ id: `${job.action_id}-r`, type: 'result', depth: job.depth, origin: 'kernel', payload: result });
    return result;
  }

  async forge(c) {
    this.state.counters.jobs++;
    const style = genres.GENRES[c.genre]?.generators[c.generator];
    const base = { op: 'built', candidate_id: c.id, genre: c.genre, generator: c.generator, ranges: style?.ranges ?? {} };
    const t0 = Date.now();
    const b = build(c);
    if (!b.ok) {
      this.state.counters.failed++;
      this.log(`forge ${c.id}: ${b.error}`);
      return { ...base, ok: false, error: b.error, params: c.params };
    }
    this.state.counters.built++;
    const dir = path.join(PATHS.cache, safeId(c.id));
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'model.glb'), b.glb);
    const sig = silhouette(b.solid);
    const { variety: v, nearest } = variety(sig, await this.descriptorsFor(c.genre));
    const passed = Object.values(b.checks).every(Boolean) && (v === null || v >= 0.05);
    let preview = null, vision = null;
    if (passed && this.previewer) {
      try {
        preview = await this.previewer.render(path.join(dir, 'model.glb'), packData(c.genre));
        await writeFile(path.join(dir, 'thumb.webp'), preview.hero);
        await writeFile(path.join(dir, 'strip.webp'), preview.strip);
        if (await this.visionAllowed()) {
          vision = await visionScore({ jpeg: preview.vision, genre: c.genre, generator: c.generator, config: this.config, log: (m) => this.log(m) });
          if (vision) this.visionTimes.push(Date.now());
        }
      } catch (e) {
        this.error(`preview ${c.id}: ${e.message}`);
      }
    }
    const meta = {
      candidate: c, name: b.name, sha: b.sha, params: b.params, metrics: b.metrics, checks: b.checks, silhouette: sig,
      variety: v, nearest, vision, preview: preview ? { ms: preview.ms, gl: preview.gl, hero_bytes: preview.hero.length, strip_bytes: preview.strip.length } : null,
      kernel: this.kernel,
    };
    await writeFile(path.join(dir, 'built.json'), JSON.stringify(meta));
    this.log(`forge ${c.id}: ${b.name} ${b.metrics.triangles} tris, ${b.metrics.size_m.join('x')} m, variety ${v ?? 'first'}${nearest ? ` (nearest ${nearest})` : ''}${preview ? `, preview ${preview.ms} ms` : ''}${vision ? `, vision ${vision.score}` : ''}; ${Date.now() - t0} ms`);
    return { ...base, ok: true, name: b.name, params: b.params, metrics: b.metrics, checks: b.checks, variety: v, nearest, vision: vision ? { score: vision.score, model: vision.model } : null };
  }

  async visionAllowed() {
    const v = this.config.vision;
    if (!v.model) return false;
    if (v.skipWhileUnreal && await unrealRunning()) return false;
    if (freeRamGB() < v.minFreeRamGB) return false;
    this.visionTimes = this.visionTimes.filter((t) => Date.now() - t < 3600_000);
    return this.visionTimes.length < v.maxPerHour;
  }

  // ---------------------------------------------------------------- catalog

  async built(candidateId) {
    try { return JSON.parse(await readFile(path.join(PATHS.cache, safeId(candidateId), 'built.json'), 'utf8')); } catch { return null; }
  }

  fits(bytes) {
    const u = this.usage ?? { storage_bytes: 0 };
    return u.storage_bytes + bytes <= this.config.storage.budgetBytes && (u.db_bytes ?? 0) < this.config.storage.dbBudgetBytes;
  }

  async keep({ candidate_id, scores, reasons }) {
    const m = await this.built(candidate_id);
    if (!m) return { op: 'store_failed', candidate_id, error: 'build expired from the cache' };
    const dir = path.join(PATHS.cache, safeId(candidate_id));
    const c = m.candidate;
    const row = {
      name: m.name, genre: c.genre, generator: c.generator, params: m.params, seed: c.seed,
      pack_version: genres.GENRES[c.genre].version, kernel_commit: m.kernel.commit, kernel_dirty: m.kernel.dirty, manifold_version: m.kernel.manifold,
      mesh_sha256: m.sha, metrics: { ...m.metrics, preview: m.preview }, scores: { ...scores, reasons, nearest: m.nearest, vision_model: m.vision?.model ?? null },
      silhouette: m.silhouette, verdict: 'kept', lineage: c.lineage ?? {}, parent_id: isUuid(c.lineage?.parent_id) ? c.lineage.parent_id : null,
      brief_id: isUuid(c.brief_id) ? c.brief_id : null, flags: [],
    };
    const paths = objectPaths(row);
    const files = [];
    if (m.preview) {
      const thumb = await readFile(path.join(dir, 'thumb.webp')), strip = await readFile(path.join(dir, 'strip.webp'));
      if (this.fits(thumb.length + strip.length)) {
        await this.catalog.upload(paths.thumb, thumb, 'image/webp');
        await this.catalog.upload(paths.strip, strip, 'image/webp');
        files.push(paths.thumb, paths.strip);
        Object.assign(row, { thumb_path: paths.thumb, thumb_bytes: thumb.length, strip_path: paths.strip, strip_bytes: strip.length });
        if (this.usage) this.usage.storage_bytes += thumb.length + strip.length;
        await mkdir(path.join(PATHS.cache, 'thumbs'), { recursive: true });
        await copyFile(path.join(dir, 'thumb.webp'), path.join(PATHS.cache, 'thumbs', `${row.name}.webp`));
        await copyFile(path.join(dir, 'strip.webp'), path.join(PATHS.cache, 'thumbs', `${row.name}.strip.webp`));
      } else {
        row.flags.push('no-thumbnail: storage budget');
      }
    } else {
      row.flags.push('no-thumbnail: previewer unavailable');
    }
    let stored;
    try {
      stored = await this.catalog.insertAsset(row);
    } catch (e) {
      await this.catalog.remove(files).catch(() => {});
      if (e.status === 409) { await rm(dir, { recursive: true, force: true }); return { op: 'store_failed', candidate_id, error: 'duplicate mesh' }; }
      throw e;
    }
    (await this.descriptorsFor(c.genre)).push({ name: row.name, silhouette: row.silhouette, verdict: 'kept' });
    this.state.counters.kept++;
    if (this.usage) { this.usage.assets++; this.usage.awaiting_review++; }
    await rm(dir, { recursive: true, force: true });
    this.log(`keep ${row.name}: total ${scores?.total} (${reasons?.join('; ')})`);
    return { op: 'stored', candidate_id, asset_id: stored.id, name: row.name, genre: c.genre, generator: c.generator, usage: this.usageForAgent() };
  }

  usageForAgent() {
    const u = this.usage ?? {};
    return { storage_bytes: u.storage_bytes ?? 0, budget_bytes: this.config.storage.budgetBytes, awaiting_review: u.awaiting_review ?? 0, assets: u.assets ?? 0 };
  }

  async discard({ candidate_id, name, reasons, scores }) {
    this.state.counters.discarded++;
    await rm(path.join(PATHS.cache, safeId(candidate_id)), { recursive: true, force: true });
    const line = JSON.stringify({ at: new Date().toISOString(), candidate_id, name, reasons, scores }) + '\n';
    const file = path.join(PATHS.logs, 'discards.jsonl');
    await appendFile(file, line);
    try { if ((await stat(file)).size > 5e6) await rename(file, `${file}.1`); } catch { /* fine */ }
    this.log(`discard ${name ?? candidate_id}: ${reasons?.join('; ')}`);
    return null; // nothing the agent needs back
  }

  /** Approved row -> rebuild from its recipe, prove it is the same mesh, upload the .glb. */
  async publish({ asset_id }) {
    const row = await this.catalog.getAsset(asset_id);
    if (!row || row.verdict !== 'approved' || row.glb_path) return null;
    const b = build({ genre: row.genre, generator: row.generator, params: row.params });
    const flags = row.flags ?? [];
    if (!b.ok || b.sha !== row.mesh_sha256) {
      const why = b.ok ? `regen-mismatch: kernel ${this.kernel.commit.slice(0, 8)} built ${b.sha.slice(0, 12)}` : `regen-mismatch: ${b.error}`;
      await this.catalog.updateAsset(row.id, { flags: [...flags.filter((f) => !f.startsWith('regen-mismatch')), why] });
      this.error(`publish ${row.name}: ${why}`);
      return { op: 'publish_failed', asset_id, genre: row.genre, generator: row.generator, error: why };
    }
    if (!this.fits(b.glb.length)) {
      await this.catalog.updateAsset(row.id, { flags: [...flags, 'no-glb: storage budget'] });
      this.error(`publish ${row.name}: storage budget reached (${this.usage?.storage_bytes} bytes)`);
      return { op: 'publish_failed', asset_id, genre: row.genre, generator: row.generator, error: 'storage budget', usage: this.usageForAgent() };
    }
    const p = objectPaths(row).glb;
    await this.catalog.upload(p, b.glb, 'model/gltf-binary');
    await this.catalog.updateAsset(row.id, { glb_path: p, glb_bytes: b.glb.length });
    if (this.usage) this.usage.storage_bytes += b.glb.length;
    this.state.counters.published++;
    this.log(`publish ${row.name}: ${(b.glb.length / 1024).toFixed(0)} KB .glb (rebuilt, sha matches)`);
    return { op: 'published', asset_id, genre: row.genre, generator: row.generator, usage: this.usageForAgent() };
  }

  async cleanCache() {
    const cutoff = Date.now() - this.config.cacheHours * 3600_000;
    for (const d of await readdir(PATHS.cache)) {
      if (d === 'thumbs' || d === 'glb') continue;
      const p = path.join(PATHS.cache, d);
      try { if ((await stat(p)).mtimeMs < cutoff) await rm(p, { recursive: true, force: true }); } catch { /* gone */ }
    }
  }

  status() {
    return {
      agent: `${this.manifest?.name}@${this.manifest?.version}`,
      catalog: this.catalog.kind,
      kernel: this.kernel,
      started_at: this.state?.startedAt,
      counters: this.state?.counters,
      queue: { jobs: this.state?.jobs.length ?? 0, deliveries: this.state?.deliveries.length ?? 0 },
      usage: this.usage,
      budget: { storage_bytes: this.config.storage.budgetBytes, db_bytes: this.config.storage.dbBudgetBytes, max_awaiting_review: this.config.review.maxAwaitingReview },
      rate: { candidates_per_hour: this.config.rate.candidatesPerHour, factor: this.factor ?? 1 },
      previewer: this.previewer ? (this.previewer.gl ?? 'ready') : 'off',
      vision: this.config.vision.model ?? 'off',
      errors: this.errors.slice(-5),
    };
  }
}

