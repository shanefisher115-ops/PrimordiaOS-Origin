// RealmAssetEngineer — PrimordiaOS agent (Agent Container Standard v1, runtime v1.2)
// Lifecycle functions are realm-agnostic: data in, data out, no I/O.
// The runtime (runtime/folder.js, runtime/http.js, runtime/worker.js) handles all I/O; the workshop
// (../workshop) delivers events and serves the two tool capabilities this agent's actions target:
//   capability:forge    build a recipe with the Primordia-cad kernel, preview it in WebGL, measure it
//   capability:catalog  keep / discard / publish in the Supabase catalog
//
// What the agent decides (deterministically, from a seeded PRNG and its memory):
//   brief   (task)    which generators and parameters to try, within the genre pack's style ranges:
//                     exploration, mutation of Shane's approved pieces, taste-guided sampling, optional steer
//   built   (result)  keep or discard: mechanical checks, silhouette variety, taste, optional vision score,
//                     with a bar that rises as storage fills or the review backlog grows
//   review  (signal)  Shane's approve/reject: updates taste and elites; approved pieces get published
//
// Model guidance (optional): when the kernel's policy layer is configured, decide() receives
// state.advise(event, memory) for briefs and uses only its policy-approved envelopes. Without it (or when it
// is unavailable) decide() is fully deterministic.

const AGENT_VERSION = '1.0.0'; // keep in step with agent.json
const BINS = 4; // taste bins per parameter range
const ELITES = 6; // approved recipes remembered per genre/generator
const CHECKS = ['closed', 'finite', 'volume', 'budget', 'size', 'base'];
// Coarse steering axes a brief's notes (or a model) can push, and the generator parameters they move.
const AXES = {
  height: ['height', 'spireHeight', 'wallHeight', 'length'],
  width: ['baseWidth', 'width', 'diameter', 'pierWidth', 'pierDepth', 'depth', 'thickness', 'lanternSize', 'span', 'rimWidth', 'frameWidth'],
  ornament: ['crockets', 'crocketSize', 'bands', 'foils', 'petals', 'lancets', 'panels', 'gablets', 'lucarnes', 'pinnacles', 'pinnacle', 'arms', 'lights', 'sides', 'rose', 'posts', 'style'],
};
const AXIS_OF = Object.fromEntries(Object.entries(AXES).flatMap(([axis, ps]) => ps.map((p) => [p, axis])));

export const POLICY = {
  minVariety: 0.05, // closer than this to a catalogued silhouette is a duplicate
  varietyScale: 0.25, // variety at which the variety term saturates
  keepThreshold: 0.5,
  maxAwaitingReview: 150,
};

// ------------------------------------------------------------------ deterministic helpers

export function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

export function prng(seed) { // mulberry32
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round3 = (v) => Math.round(v * 1000) / 1000;
const gauss = (rand) => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());

function value(style, param, u) {
  const [lo, hi] = style.ranges[param];
  if (style.integer?.[param]) return Math.min(hi, lo + Math.floor(u * (hi - lo + 1)));
  return round3(lo + u * (hi - lo));
}

/** u in [0,1) pushed towards 1 (b > 0) or 0 (b < 0); b in [-1, 1]. */
function skew(u, b) {
  return b ? Math.pow(u, Math.pow(2, -1.5 * clamp(b, -1, 1))) : u;
}

// ------------------------------------------------------------------ taste (Shane's reviews)

export function binOf(v, [lo, hi]) {
  return hi > lo ? clamp(Math.floor(((v - lo) / (hi - lo)) * BINS), 0, BINS - 1) : 0;
}

const posterior = (t) => ((t?.a ?? 0) + 1) / ((t?.a ?? 0) + (t?.r ?? 0) + 2); // Beta(1, 1) mean

/** 0.5 with no reviews; towards 1 for generators and parameter bins Shane approves, towards 0 for rejections. */
export function tasteScore(memory, genre, kind, params, ranges) {
  const taste = memory.taste ?? {};
  const g = posterior(taste[`${genre}/${kind}`]);
  const ps = Object.entries(ranges ?? {}).map(([p, r]) => posterior(taste[`${genre}/${kind}/${p}/${binOf(params[p], r)}`]));
  const pm = ps.length ? ps.reduce((s, x) => s + x, 0) / ps.length : 0.5;
  return round3(0.5 * g + 0.5 * pm);
}

function reviewsOf(memory, genre, kind) {
  const t = memory.taste?.[`${genre}/${kind}`];
  return (t?.a ?? 0) + (t?.r ?? 0);
}

// ------------------------------------------------------------------ proposing candidates

function chooseGenerator(style, memory, genre, rand, steer, only) {
  const kinds = (only?.length ? only : Object.keys(style.generators)).filter((k) => style.generators[k]);
  if (!kinds.length) return null;
  const kept = memory.stats?.[genre]?.kept_by_kind ?? {};
  const w = kinds.map((k) => {
    const novelty = 1 / (1 + (kept[k] ?? 0) / 12);
    const taste = 2 * posterior(memory.taste?.[`${genre}/${k}`]);
    return style.generators[k].weight * (steer?.weights?.[k] ?? 1) * novelty * Math.sqrt(taste);
  });
  let r = rand() * w.reduce((s, x) => s + x, 0);
  for (let i = 0; i < kinds.length; i++) { r -= w[i]; if (r <= 0) return kinds[i]; }
  return kinds[kinds.length - 1];
}

function explore(style, rand, bias) {
  const params = { ...(style.fixed ?? {}) };
  for (const p of Object.keys(style.ranges)) params[p] = value(style, p, skew(rand(), bias?.[AXIS_OF[p]] ?? 0));
  return params;
}

/** Each parameter drawn from a bin chosen in proportion to its sharpened taste posterior. */
function tasteGuided(style, rand, memory, genre, kind) {
  const params = { ...(style.fixed ?? {}) };
  for (const p of Object.keys(style.ranges)) {
    const w = Array.from({ length: BINS }, (_, b) => posterior(memory.taste?.[`${genre}/${kind}/${p}/${b}`]) ** 2);
    let r = rand() * w.reduce((s, x) => s + x, 0), bin = BINS - 1;
    for (let b = 0; b < BINS; b++) { r -= w[b]; if (r <= 0) { bin = b; break; } }
    params[p] = value(style, p, (bin + rand()) / BINS);
  }
  return params;
}

function mutate(parent, style, rand) {
  const params = { ...(style.fixed ?? {}), ...parent };
  const keys = Object.keys(style.ranges);
  let changed = 0;
  keys.forEach((p, i) => {
    if (rand() < 0.5 || (i === keys.length - 1 && changed === 0)) {
      const [lo, hi] = style.ranges[p];
      const v = clamp((params[p] ?? lo) + gauss(rand) * 0.15 * (hi - lo), lo, hi);
      params[p] = style.integer?.[p] ? Math.round(v) : round3(v);
      changed++;
    }
  });
  return params;
}

export function planBrief(payload, memory, seq) {
  const style = payload.style;
  const genre = payload.genre;
  const count = clamp(Math.floor(payload.count ?? 4), 1, 50);
  const candidates = [];
  for (let i = 0; i < count; i++) {
    const seed = hash32(`${payload.brief_id}:${i}:${seq + i}`);
    const rand = prng(seed);
    const kind = chooseGenerator(style, memory, genre, rand, payload.steer, payload.generators);
    if (!kind) break;
    const gs = style.generators[kind];
    const elites = memory.elites?.[`${genre}/${kind}`] ?? [];
    const reviewed = reviewsOf(memory, genre, kind);
    let mode = 'explore', parent = null, params;
    const exploit = elites.length ? 0.3 + 0.3 * Math.min(1, reviewed / 20) : 0;
    const r = rand();
    if (r < exploit) {
      parent = elites[Math.floor(rand() * elites.length)];
      mode = 'mutate';
      params = mutate(parent.params, gs, rand);
    } else if (reviewed >= 3 && r < exploit + 0.35) {
      mode = 'taste';
      params = tasteGuided(gs, rand, memory, genre, kind);
    } else {
      params = explore(gs, rand, payload.steer?.bias);
    }
    candidates.push({
      id: `${payload.brief_id}:${i}`,
      genre, generator: kind, params, seed,
      brief_id: payload.brief_id,
      lineage: { mode, parent_name: parent?.name ?? null, parent_id: parent?.asset_id ?? null, brief_id: payload.brief_id, agent_version: AGENT_VERSION, pack_version: style.version },
    });
  }
  return { candidates, seqAfter: seq + count };
}

// ------------------------------------------------------------------ judging built pieces

export function keepThreshold(usage) {
  const fill = usage?.budget_bytes ? usage.storage_bytes / usage.budget_bytes : 0;
  const backlog = (usage?.awaiting_review ?? 0) / POLICY.maxAwaitingReview;
  return round3(POLICY.keepThreshold + 0.35 * clamp((fill - 0.6) / 0.4, 0, 1) + 0.25 * clamp((backlog - 0.5) / 0.5, 0, 1));
}

export function judge(p, memory) {
  if (!p.ok) return { keep: false, reasons: [`build failed: ${p.error}`], scores: null };
  const failed = CHECKS.filter((c) => p.checks?.[c] === false);
  if (failed.length) return { keep: false, reasons: failed.map((c) => `failed ${c} check`), scores: null };
  const variety = p.variety ?? null;
  const taste = tasteScore(memory, p.genre, p.generator, p.params, p.ranges);
  const vision = typeof p.vision?.score === 'number' ? clamp(p.vision.score, 0, 1) : null;
  const varietyTerm = variety === null ? 1 : Math.min(1, variety / POLICY.varietyScale);
  const total = round3(vision === null ? 0.55 * varietyTerm + 0.45 * taste : 0.4 * varietyTerm + 0.3 * taste + 0.3 * vision);
  const threshold = keepThreshold(memory.usage);
  const scores = { variety, taste, vision, total, threshold };
  if (variety !== null && variety < POLICY.minVariety) return { keep: false, reasons: [`near-duplicate of ${p.nearest} (variety ${variety})`], scores };
  if (total < threshold) return { keep: false, reasons: [`score ${total} below ${threshold}`], scores };
  return { keep: true, reasons: [variety === null ? 'first of its genre' : `variety ${variety}, taste ${taste}${vision === null ? '' : `, vision ${vision}`}`], scores };
}

// ------------------------------------------------------------------ lifecycle

export async function init(context) {
  // Called once per boot. `context` = { manifest, realm, memory }.
  return { booted_at: new Date().toISOString(), realm: context.realm };
}

export async function perceive(input) {
  // input = { events, memory, context }. Keep the event for advise().
  return input.events.map((e) => ({ id: e.id, type: e.type, op: e.payload?.op, payload: e.payload ?? {}, depth: e.depth, event: e }));
}

// Outcomes from advise() that mean "the policy layer decided"; anything else -> deterministic fallback.
const ADVICE_USED = new Set(['act', 'noop', 'reject', 'blocked', 'human_review', 'duplicate']);

export async function decide(state) {
  // state = { observations, memory, context, advise? }. Without advise this is deterministic.
  const memory = state.memory ?? {};
  const decisions = [];
  let seq = memory.seq ?? 0;
  for (const o of state.observations) {
    const base = { for: o.id, depth: o.depth };
    if (o.type === 'task' && o.op === 'brief') {
      if (!o.payload.style?.generators || !o.payload.genre || !o.payload.brief_id) {
        decisions.push({ ...base, kind: 'ignore', reason: 'brief without genre, brief_id or style' });
        continue;
      }
      if (state.advise) {
        const r = await state.advise(o.event, memory);
        if (ADVICE_USED.has(r.outcome) && r.code !== 'POLICY_KILL_SWITCH') {
          decisions.push({ ...base, kind: 'advised', envelopes: r.actions ?? [] });
          continue;
        }
      }
      const plan = planBrief(o.payload, memory, seq);
      seq = plan.seqAfter;
      decisions.push({ ...base, kind: 'brief', genre: o.payload.genre, brief_id: o.payload.brief_id, candidates: plan.candidates, seq });
    } else if (o.type === 'result' && o.op === 'built') {
      decisions.push({ ...base, kind: 'verdict', genre: o.payload.genre, generator: o.payload.generator, candidate_id: o.payload.candidate_id, name: o.payload.name, ok: !!o.payload.ok, ...judge(o.payload, memory) });
    } else if (o.type === 'result' && ['stored', 'store_failed', 'published', 'publish_failed', 'discarded'].includes(o.op)) {
      decisions.push({ ...base, kind: 'ack', op: o.op, genre: o.payload.genre, generator: o.payload.generator, usage: o.payload.usage ?? null });
    } else if (o.type === 'signal' && o.op === 'review' && ['approved', 'rejected', 'kept'].includes(o.payload.verdict)) {
      const p = o.payload;
      decisions.push({
        ...base, kind: 'review', genre: p.genre, generator: p.generator, asset_id: p.asset_id, name: p.name,
        params: p.params ?? {}, ranges: p.ranges ?? {}, verdict: p.verdict, previous: p.previous ?? 'kept',
        publish: p.verdict === 'approved' && !p.has_glb,
      });
    } else {
      decisions.push({ ...base, kind: 'ignore', reason: `unhandled ${o.type}/${o.op ?? '-'}` });
    }
  }
  return decisions;
}

export async function act(decision) {
  // Return outbox actions. The runtime delivers them; never send directly.
  // depth = triggering event depth; the runtime adds the hop.
  return decision.flatMap((d) => {
    switch (d.kind) {
      case 'advised':
        return d.envelopes.map((e) => ({
          id: e.id, type: e.type, target: e.target, payload: e.payload, provenance: e.provenance,
          ...(e.capability ? { capability: e.capability } : {}),
          depth: d.depth,
        }));
      case 'brief':
        return [
          ...d.candidates.map((c) => ({ type: 'task', target: 'capability:forge', depth: d.depth, payload: { op: 'build', candidate: c } })),
          { type: 'result', target: 'kernel', depth: d.depth, payload: { op: 'brief_planned', brief_id: d.brief_id, candidates: d.candidates.length } },
        ];
      case 'verdict':
        return [{
          type: 'task', target: 'capability:catalog', depth: d.depth,
          payload: { op: d.keep ? 'keep' : 'discard', candidate_id: d.candidate_id, name: d.name, scores: d.scores, reasons: d.reasons },
        }];
      case 'review':
        return d.publish ? [{ type: 'task', target: 'capability:catalog', depth: d.depth, payload: { op: 'publish', asset_id: d.asset_id, name: d.name } }] : [];
      default:
        return [];
    }
  });
}

function bump(obj, key, by = 1) { obj[key] = (obj[key] ?? 0) + by; }

export async function persist(state) {
  // state = { memory, decision, actions }. Return the new long-term memory.
  const m = structuredClone(state.memory ?? {});
  m.agent_version = AGENT_VERSION;
  m.taste ??= {}; m.elites ??= {}; m.stats ??= {};
  const stats = (genre) => (m.stats[genre] ??= { proposed: 0, built: 0, failed: 0, kept: 0, discarded: 0, approved: 0, rejected: 0, kept_by_kind: {}, approved_by_kind: {} });
  for (const d of state.decision) {
    if (d.kind === 'brief') {
      m.seq = d.seq;
      stats(d.genre).proposed += d.candidates.length;
    } else if (d.kind === 'verdict') {
      const s = stats(d.genre);
      if (d.ok) s.built++; else s.failed++;
      if (d.keep) { s.kept++; bump(s.kept_by_kind, d.generator); } else s.discarded++;
    } else if (d.kind === 'ack' && d.usage) {
      m.usage = d.usage;
    } else if (d.kind === 'review' && d.verdict !== d.previous) {
      const s = stats(d.genre);
      const apply = (verdict, sign) => {
        const field = verdict === 'approved' ? 'a' : verdict === 'rejected' ? 'r' : null;
        if (!field) return;
        if (verdict === 'approved') { s.approved += sign; bump(s.approved_by_kind, d.generator, sign); } else s.rejected += sign;
        const keys = [`${d.genre}/${d.generator}`, ...Object.entries(d.ranges).map(([p, r]) => `${d.genre}/${d.generator}/${p}/${binOf(d.params[p], r)}`)];
        for (const k of keys) { const t = (m.taste[k] ??= { a: 0, r: 0 }); t[field] = Math.max(0, t[field] + sign); }
      };
      apply(d.previous, -1);
      apply(d.verdict, +1);
      const key = `${d.genre}/${d.generator}`;
      const elites = (m.elites[key] ?? []).filter((e) => e.name !== d.name);
      if (d.verdict === 'approved') elites.push({ name: d.name, asset_id: d.asset_id, params: d.params });
      m.elites[key] = elites.slice(-ELITES);
    }
  }
  m.loops = (m.loops || 0) + 1;
  m.last_run = new Date().toISOString();
  return m;
}

// Folder realm: `node agent.js` runs one loop via the shared runtime.
// Guarded so this file still imports cleanly inside a Cloudflare Worker, and the import specifier is
// non-literal on purpose: bundlers (wrangler/esbuild) leave it alone, so the Node-only folder runtime
// never ends up in the Worker bundle.
const invokedDirectly =
  typeof process !== 'undefined' &&
  process.argv?.[1] &&
  decodeURIComponent(import.meta.url).endsWith(process.argv[1].replace(/\\/g, '/'));
if (invokedDirectly) {
  const { runFolderLoop } = await import(new URL('./runtime/folder.js', import.meta.url).href);
  await runFolderLoop(new URL('.', import.meta.url), { init, perceive, decide, act, persist });
}
