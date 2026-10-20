// RealmAssetEngineer: deterministic planning inside the style, judging, learning from reviews, and the
// standard's loop safety when run through the shared runtime core.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as agent from '../RealmAssetEngineer/agent.js';
import { runLoop } from '../RealmAssetEngineer/runtime/core.js';

const manifest = JSON.parse(readFileSync(new URL('../RealmAssetEngineer/agent.json', import.meta.url), 'utf8'));

const style = {
  version: '1.0.0', assetPrefix: 'Gothic',
  generators: {
    spire: { weight: 1, ranges: { height: [18, 90], sides: [6, 12], crockets: [4, 18] }, fixed: { lucarnes: 1 }, integer: { height: false, sides: true, crockets: true }, triangleBudget: 1e5, maxSize: [24, 24, 95], title: 'Spire' },
    lamp: { weight: 1, ranges: { height: [3.2, 5.5], arms: [0, 4] }, fixed: { glass: 1 }, integer: { height: false, arms: true }, triangleBudget: 1e4, maxSize: [4, 4, 6], title: 'StreetLamp' },
  },
};
const brief = (id, extra = {}) => ({ id: `brief-${id}`, type: 'task', depth: 0, payload: { op: 'brief', brief_id: id, genre: 'gothic', count: 6, style, ...extra } });

async function plan(events, memory = {}) {
  const observations = await agent.perceive({ events, memory, context: {} });
  const decision = await agent.decide({ observations, memory, context: {} });
  return { decision, actions: await agent.act(decision), memory: await agent.persist({ memory, decision, actions: [] }) };
}

test('a brief becomes forge actions inside the style ranges, deterministically', async () => {
  const a = await plan([brief('b1')]);
  const b = await plan([brief('b1')]);
  assert.deepEqual(a.actions, b.actions);
  const forge = a.actions.filter((x) => x.target === 'capability:forge');
  assert.equal(forge.length, 6);
  for (const f of forge) {
    const c = f.payload.candidate;
    const s = style.generators[c.generator];
    assert.equal(f.depth, 0);
    for (const [p, [lo, hi]] of Object.entries(s.ranges)) {
      assert.ok(c.params[p] >= lo && c.params[p] <= hi, `${p} = ${c.params[p]}`);
      if (s.integer[p]) assert.ok(Number.isInteger(c.params[p]));
    }
    for (const [p, v] of Object.entries(s.fixed)) assert.equal(c.params[p], v);
    assert.equal(c.lineage.mode, 'explore');
  }
  assert.ok(a.actions.some((x) => x.target === 'kernel' && x.payload.op === 'brief_planned'));
  assert.equal(a.memory.seq, 6);
  // A later brief with the same id but more history explores elsewhere.
  const later = await plan([brief('b1')], a.memory);
  assert.notDeepEqual(later.actions[0].payload.candidate.params, a.actions[0].payload.candidate.params);
});

test('briefs can restrict generators and steer towards taller pieces', async () => {
  const only = await plan([brief('b2', { generators: ['lamp'], count: 8 })]);
  assert.ok(only.actions.filter((x) => x.payload.op === 'build').every((x) => x.payload.candidate.generator === 'lamp'));
  const mean = (r) => { const h = r.actions.filter((x) => x.payload.op === 'build').map((x) => x.payload.candidate.params.height); return h.reduce((s, v) => s + v, 0) / h.length; };
  const tall = await plan([brief('b3', { count: 30, steer: { bias: { height: 1 } } })]);
  const plain = await plan([brief('b3', { count: 30 })]);
  assert.ok(mean(tall) > mean(plain) + 5, `${mean(tall)} vs ${mean(plain)}`);
});

const built = (extra = {}) => ({
  id: `r-${Math.random()}`, type: 'result', depth: 1,
  payload: { op: 'built', ok: true, candidate_id: 'b1:0', name: 'SM_GothicSpire_aaaaaa', genre: 'gothic', generator: 'spire', params: { height: 40, sides: 8, crockets: 9 }, ranges: style.generators.spire.ranges, checks: { closed: true, finite: true, volume: true, budget: true, size: true, base: true }, variety: 0.3, nearest: 'SM_GothicSpire_bbbbbb', ...extra },
});

test('the judge keeps varied pieces and discards broken, duplicate or low-scoring ones', async () => {
  const keep = await plan([built()]);
  assert.equal(keep.actions[0].payload.op, 'keep');
  assert.equal(keep.actions[0].depth, 1);
  const open = await plan([built({ checks: { closed: false, finite: true, volume: true, budget: true, size: true, base: true } })]);
  assert.equal(open.actions[0].payload.op, 'discard');
  assert.match(open.actions[0].payload.reasons[0], /closed/);
  const dup = await plan([built({ variety: 0.01 })]);
  assert.match(dup.actions[0].payload.reasons[0], /near-duplicate of SM_GothicSpire_bbbbbb/);
  const failed = await plan([built({ ok: false, error: 'kernel: boom' })]);
  assert.equal(failed.actions[0].payload.op, 'discard');
  // The bar rises as storage fills: the same piece is discarded at 95 % of the budget.
  const full = await plan([built({ variety: 0.1 })], { usage: { storage_bytes: 95, budget_bytes: 100, awaiting_review: 0 } });
  assert.equal(full.actions[0].payload.op, 'discard');
  assert.ok(agent.keepThreshold({ storage_bytes: 95, budget_bytes: 100 }) > agent.keepThreshold({ storage_bytes: 10, budget_bytes: 100 }));
});

const review = (verdict, previous = 'kept', extra = {}) => ({
  id: `rev-${verdict}-${previous}`, type: 'signal', depth: 0,
  payload: { op: 'review', asset_id: 'a1', name: 'SM_GothicSpire_aaaaaa', genre: 'gothic', generator: 'spire', params: { height: 80, sides: 8, crockets: 9 }, ranges: style.generators.spire.ranges, verdict, previous, has_glb: false, ...extra },
});

test('reviews teach taste, feed elites and publish approved pieces; flips undo', async () => {
  const ok = await plan([review('approved')]);
  assert.deepEqual(ok.actions.map((a) => a.payload.op), ['publish']);
  assert.equal(ok.memory.taste['gothic/spire'].a, 1);
  assert.equal(ok.memory.elites['gothic/spire'][0].name, 'SM_GothicSpire_aaaaaa');
  assert.ok(agent.tasteScore(ok.memory, 'gothic', 'spire', { height: 80, sides: 8, crockets: 9 }, style.generators.spire.ranges) > 0.5);
  const flipped = await plan([review('rejected', 'approved')], ok.memory);
  assert.deepEqual(flipped.actions, []);
  assert.equal(flipped.memory.taste['gothic/spire'].a, 0);
  assert.equal(flipped.memory.taste['gothic/spire'].r, 1);
  assert.equal(flipped.memory.elites['gothic/spire'].length, 0);
  assert.ok(agent.tasteScore(flipped.memory, 'gothic', 'spire', { height: 80, sides: 8, crockets: 9 }, style.generators.spire.ranges) < 0.5);
  // With approved elites, briefs start mutating them.
  const seeded = await plan([brief('b9', { count: 20, generators: ['spire'] })], ok.memory);
  assert.ok(seeded.actions.some((a) => a.payload.candidate?.lineage.mode === 'mutate' && a.payload.candidate.lineage.parent_name === 'SM_GothicSpire_aaaaaa'));
});

test('through the runtime core: depth stamped, deep events dropped, repeats skipped', async () => {
  const store = { memory: {}, inbox: [brief('b10', { count: 2 }), { ...brief('deep'), id: 'deep', depth: 9 }], outbox: [] };
  const io = { read: async (k, f) => structuredClone(store[k] ?? f), write: async (k, v) => { store[k] = v; }, log: () => {} };
  await runLoop(agent, manifest, io, 'dev');
  assert.equal(store.outbox.filter((a) => a.target === 'capability:forge').length, 2);
  assert.ok(store.outbox.every((a) => a.depth === 1 && a.origin === 'RealmAssetEngineer'));
  assert.deepEqual(store.inbox, []);
  store.inbox = [brief('b10', { count: 2 })]; // same id again
  store.outbox = [];
  await runLoop(agent, manifest, io, 'dev');
  assert.equal(store.outbox.length, 0);
});

test('agent.json follows the standard', () => {
  assert.equal(manifest.name, 'RealmAssetEngineer');
  assert.ok(manifest.safety.max_loop_depth >= 3 && manifest.safety.max_loop_depth <= 7);
  assert.equal(manifest.safety.idempotent, true);
  assert.ok(manifest.safety.promotion_rules.includes('no-infinite-recursion'));
  assert.equal(manifest.version, readFileSync(new URL('../RealmAssetEngineer/agent.js', import.meta.url), 'utf8').match(/AGENT_VERSION = '([^']+)'/)[1]);
});
