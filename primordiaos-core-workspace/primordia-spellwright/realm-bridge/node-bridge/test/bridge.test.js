import { test } from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { createBridge } from '../src/server.js';
import { validatePacket } from '../src/schemas.js';
import { genesis, evolve, validateManifest } from '../src/realm/prs1.js';
import { synthesizeTopology } from '../src/realm/topology.js';
import { createMetaState } from '../src/state.js';
import { mulberry32 } from '../src/prng.js';

const quiet = () => {};

function collect(url, ms, onOpen) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const packets = [];
    ws.on('open', () => onOpen?.(ws));
    ws.on('message', (raw) => packets.push(JSON.parse(raw.toString())));
    ws.on('error', reject);
    setTimeout(() => {
      ws.close();
      resolve(packets);
    }, ms);
  });
}

test('genesis is deterministic and PRS-1 valid', () => {
  const a = genesis(1234, createMetaState());
  const b = genesis(1234, createMetaState());
  delete a.generated_by;
  delete b.generated_by;
  assert.deepEqual(a, b);
  assert.deepEqual(validateManifest(a), []);
  assert.notEqual(genesis(99, createMetaState()).realm_name + genesis(98, createMetaState()).realm_name, '');
});

test('every glyph carries a deterministic intent', () => {
  const m = genesis(1234, createMetaState());
  const soul = m.glyphs.find((g) => g.kind === 'soul');
  assert.equal(soul.intent, m.realm_name.toUpperCase());
  const place = m.realm_name.split(' ')[0].toUpperCase();
  for (const g of m.glyphs.filter((x) => x.kind !== 'soul')) {
    assert.match(g.intent, new RegExp(`^[A-Z]+ THE [A-Z]+ OF ${place}$`), g.id);
  }
  // The dominant metaphysic at birth names the object of the intent.
  const stormy = genesis(1234, { ...createMetaState(), entropy: 0.99 });
  assert.ok(stormy.glyphs.filter((g) => g.kind !== 'soul').every((g) => g.intent.includes('THE STORM')));
});

test('evolution keeps manifests valid and bumps revision', () => {
  const state = createMetaState();
  const rng = mulberry32(7);
  let m = genesis(42, state);
  for (let i = 0; i < 200; i++) {
    state.entropy = (i % 10) / 10;
    m = evolve(m, state, rng);
    assert.deepEqual(validateManifest(m), [], `revision ${m.revision}`);
  }
  assert.equal(m.revision, 200);
  assert.ok(m.glyphs.some((g) => g.kind === 'soul'), 'soul glyph never dissolves');
});

test('every topology kind produces in-range edges', () => {
  for (const kind of ['lattice', 'small_world', 'scale_free', 'toroidal', 'fractal_tree']) {
    const { nodes, edges } = synthesizeTopology({ kind, node_count: 50, edge_density: 0.5, radius: 10 }, 3);
    assert.equal(nodes.length, 50, kind);
    assert.ok(edges.length > 0, kind);
    for (const [a, b] of edges) assert.ok(a >= 0 && b < 50 && a !== b, `${kind} edge ${a}-${b}`);
  }
});

test('bridge streams every packet type with valid envelopes', async () => {
  const bridge = await createBridge({ port: 0, log: quiet, evolveSeconds: 0.5, validate: true });
  try {
    const packets = await collect(`ws://127.0.0.1:${bridge.port}`, 1500, (ws) =>
      ws.send(JSON.stringify({ type: 'hello', client: 'test' })),
    );
    assert.equal(packets[0].type, 'hello');
    const types = new Set(packets.map((p) => p.type));
    for (const t of ['heart_beat', 'cosmic_web', 'fate_weave', 'soul_unification', 'dream_nebula', 'shadow_inversion', 'realm_manifest']) {
      assert.ok(types.has(t), `missing ${t}`);
    }
    for (const p of packets) assert.deepEqual(validatePacket(p), [], `${p.type}/${p.id}`);
    assert.equal(bridge.stats.invalid, 0);

    // Heart is the 60 Hz stream; allow for timer granularity on CI/Windows.
    const hearts = packets.filter((p) => p.type === 'heart_beat').length;
    assert.ok(hearts >= 45, `heart_beat rate too low: ${hearts} in 1.5s`);

    // The first cosmic_web after connect is a keyframe carrying edges.
    assert.ok(packets.find((p) => p.type === 'cosmic_web').payload.edges.length > 0);

    // Evolution every 0.5s => several manifest revisions arrived.
    const revs = new Set(packets.filter((p) => p.type === 'realm_manifest').map((p) => p.payload.revision));
    assert.ok(revs.size >= 2, `expected evolving manifests, saw ${[...revs]}`);
  } finally {
    await bridge.close();
  }
});

test('commands are acknowledged and set_rate throttles', async () => {
  const bridge = await createBridge({ port: 0, log: quiet, evolveSeconds: 0 });
  try {
    const packets = await collect(`ws://127.0.0.1:${bridge.port}`, 1100, (ws) => {
      ws.send(JSON.stringify({ type: 'set_rate', hz: 10 }));
      ws.send(JSON.stringify({ type: 'command', name: 'perturb', args: { key: 'entropy', value: 0.95 } }));
      ws.send(JSON.stringify({ type: 'command', name: 'nonsense' }));
      ws.send(JSON.stringify({ type: 'ping', nonce: 7 }));
    });
    const acks = packets.filter((p) => p.type === 'ack').map((p) => p.payload);
    assert.deepEqual(acks.map((a) => a.ok), [true, false]);
    assert.equal(packets.find((p) => p.type === 'pong').payload.nonce, 7);
    const hearts = packets.filter((p) => p.type === 'heart_beat').length;
    assert.ok(hearts <= 14, `set_rate 10 Hz not honoured: ${hearts} heart_beats in 1.1s`);
  } finally {
    await bridge.close();
  }
});
