import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateManifest } from '../src/realm/prs1.js';
import { payloadSchemas, validate } from '../src/schemas.js';
import { createMetaState } from '../src/state.js';
import { loadModules } from '../src/modules/index.js';
import { machineGenesis, machineEvolve } from '../realms/machine/realm.js';
import { machine } from '../realms/machine/telemetry.js';

const fakeTelemetry = (load, memUsed = 0.5) => ({
  cores: Array.from({ length: machine.logical }, (_, i) => ({ load: i === 0 ? 1 : load })),
  load,
  imbalance: 0.2,
  memUsed,
  procs: [],
  churn: 0,
  netRx: 0,
  netTx: 0,
});

test('machine realm is built from the hardware and is PRS-1 valid', () => {
  const a = machineGenesis(createMetaState(), fakeTelemetry(0.2));
  const b = machineGenesis(createMetaState(), fakeTelemetry(0.9, 0.9));
  assert.deepEqual(validateManifest(a), []);
  // Same machine, same realm: identity and structure don't depend on the load.
  assert.equal(a.realm_id, b.realm_id);
  assert.deepEqual(a.layers.map((l) => [l.id, l.params]), b.layers.map((l) => [l.id, l.params]));
  const cores = a.glyphs.filter((g) => g.id.startsWith('core-'));
  assert.equal(cores.length, Math.min(machine.logical, 16));
  // Distinct strings aren't enough: inscription strikes vowels and repeated letters
  // (PrimordiaSigil::Inscribe), so check that each core's monogram differs.
  const inscribe = (s) => {
    let o = '';
    for (const c of s.toUpperCase()) {
      if (c < 'A' || c > 'Z' || ('AEIOU'.includes(c) && o) || o.includes(c)) continue;
      o += c;
      if (o.length === 12) break;
    }
    return o;
  };
  assert.equal(new Set(cores.map((g) => inscribe(g.intent))).size, cores.length, 'each core has its own monogram');
  assert.ok(a.glyphs.some((g) => g.kind === 'ward') && a.glyphs.some((g) => g.kind === 'gate'));
  // A pinned core's sigil is bigger and hotter than an idle one's.
  const [pinned, idle] = [cores[0], cores[1] ?? cores[0]];
  if (cores.length > 1) assert.ok(pinned.scale > idle.scale && pinned.hue < idle.hue);
});

test('machine realm evolves within bounded deltas', () => {
  let m = machineGenesis(createMetaState(), fakeTelemetry(0));
  for (let i = 0; i < 30; i++) {
    const prev = m;
    m = machineEvolve(m, createMetaState(), fakeTelemetry(i % 2 ? 1 : 0, i % 2 ? 1 : 0));
    assert.deepEqual(validateManifest(m), [], `revision ${m.revision}`);
    m.layers.forEach((l, k) => assert.ok(Math.abs(l.density - prev.layers[k].density) <= 0.0501, `${l.id} jumped`));
  }
  assert.equal(m.revision, 30);
});

test('machine modules load through --modules and emit valid payloads', async () => {
  const modules = await loadModules({ seed: 1, modulesDir: new URL('../realms/machine', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), evolveSeconds: 1 });
  assert.equal(modules.length, 9);
  const ctx = { t: 0, state: createMetaState(), manifest: null };
  for (const m of modules) m.init(ctx);
  for (let i = 0; i < 90; i++) for (const m of modules) m.step(1 / 30, ctx);
  const packets = modules.flatMap((m) => m.sample(ctx, { full: true }));
  const types = new Set(packets.map((p) => p.type));
  for (const t of ['realm_manifest', 'heart_beat', 'soul_unification', 'fate_weave', 'dream_nebula', 'shadow_inversion']) {
    assert.ok(types.has(t), `missing ${t}`);
  }
  for (const p of packets) assert.deepEqual(validate(p.payload, payloadSchemas[p.type], `${p.type}/${p.id}`), []);
  const weave = packets.find((p) => p.type === 'fate_weave').payload;
  assert.ok(weave.threads.filter((t) => t.id.startsWith('core-')).length === machine.logical, 'one thread per core');
});
