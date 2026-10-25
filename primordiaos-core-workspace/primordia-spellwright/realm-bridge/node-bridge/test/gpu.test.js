// The GPU loop on the PrimordiaOS side: Onyx telemetry in, realm quality out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import { createBridge } from '../src/server.js';
import { validatePacket } from '../src/schemas.js';
import { createTuner, applyQuality } from '../src/gpu/tuner.js';
import { createOnyxHub, loadOf } from '../src/gpu/onyx.js';
import { genesis } from '../src/realm/prs1.js';
import { createMetaState } from '../src/state.js';

const quiet = () => {};

function frame(frameMs, { budgetMs = 16.667, memory = 0.1, tick = 1 } = {}) {
  return { type: 'telemetry', source: 'unreal', tick, device: 'test GPU', gpu: { frame_ms: frameMs, budget_ms: budgetMs, memory_pressure: memory } };
}

/** A client that records packets and can wait for one matching a predicate. */
function client(port) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  const packets = [];
  const waiters = [];
  ws.on('message', (raw) => {
    const p = JSON.parse(raw);
    packets.push(p);
    for (const w of [...waiters]) {
      if (w.pred(p)) {
        waiters.splice(waiters.indexOf(w), 1);
        clearTimeout(w.timer);
        w.resolve(p);
      }
    }
  });
  return {
    ws,
    packets,
    open: () => new Promise((r) => ws.once('open', r)),
    send: (m) => ws.send(JSON.stringify(m)),
    waitFor: (pred, ms = 8000) =>
      new Promise((resolve, reject) => {
        const found = packets.find(pred);
        if (found) return resolve(found);
        const w = { pred, resolve, timer: setTimeout(() => reject(new Error('timed out waiting for packet')), ms) };
        waiters.push(w);
      }),
    close: () => ws.close(),
  };
}

test('tuner steps down under sustained load and recovers more slowly', () => {
  const t = createTuner({ holdSeconds: 2, cooldownSeconds: 4, smoothing: 1 });
  assert.equal(t.observe(1.4, 0), null, 'one bad frame is not enough');
  assert.equal(t.observe(1.4, 1), null);
  assert.deepEqual(t.observe(1.4, 2.5), { quality: 0.9, reason: 'over_budget', load: 1.4 });
  assert.equal(t.observe(1.4, 3), null, 'cooldown');
  assert.equal(t.observe(1.4, 7).quality, 0.8);
  // Recovery: needs twice the hold and climbs half a step.
  assert.equal(t.observe(0.3, 12), null);
  assert.equal(t.observe(0.3, 14), null);
  assert.deepEqual(t.observe(0.3, 16.1), { quality: 0.85, reason: 'headroom', load: 0.3 });
  // In the dead band nothing changes.
  assert.equal(t.observe(0.7, 30), null);
  assert.equal(t.quality, 0.85);
});

test('tuner never drops below its floor and can be pinned', () => {
  const t = createTuner({ holdSeconds: 0, cooldownSeconds: 0, smoothing: 1, minQuality: 0.3 });
  for (let i = 0; i < 20; i++) t.observe(5, i);
  assert.equal(t.quality, 0.3);
  assert.equal(t.pin(0.7), 0.7);
  assert.equal(t.observe(5, 100), null, 'pinned quality does not move');
  assert.equal(t.quality, 0.7);
  t.pin(null);
  assert.equal(t.quality, 0.3);
});

test('the delivered manifest thins density but the authored one is untouched', () => {
  const m = genesis(0x5eed1e55, createMetaState());
  const before = m.layers.map((l) => l.density);
  const thin = applyQuality(m, 0.5);
  assert.deepEqual(m.layers.map((l) => l.density), before);
  assert.deepEqual(thin.layers.map((l) => l.density), before.map((d) => Math.round(d * 0.5 * 10000) / 10000));
  assert.equal(thin.gpu_quality, 0.5);
  assert.equal(applyQuality(m, 1), m, 'full quality is the authored manifest itself');
  assert.deepEqual(validatePacket({ prs: 1, type: 'realm_manifest', op: 'upsert', id: m.realm_id, seq: 1, t: 0, ts: 0, payload: thin }), []);
});

test('Onyx hub: load is time or memory, whichever is worse; stale sources expire', () => {
  let now = 0;
  const hub = createOnyxHub({ maxAgeSeconds: 3, now: () => now });
  assert.equal(loadOf(frame(8.3).valueOf()), 8.3 / 16.667);
  assert.equal(loadOf(frame(4, { memory: 0.99 })), 0.99 / 0.9);
  assert.deepEqual(hub.ingest('unreal', frame(10)), []);
  assert.deepEqual(hub.ingest('vulkan-sidecar', frame(20)), []);
  assert.equal(hub.worst().source, 'vulkan-sidecar');
  assert.match(hub.ingest('broken', { tick: 1, gpu: {} }).join(), /frame_ms: required/);
  now = 5;
  assert.equal(hub.worst(), null);
  assert.deepEqual(hub.takePackets(), []);
});

test('Unreal telemetry over budget lowers the realm quality the renderers receive', async () => {
  const bridge = await createBridge({ port: 0, log: quiet, evolveSeconds: 0, validate: true, gpuTuner: { holdSeconds: 0, cooldownSeconds: 0, smoothing: 1 } });
  const c = client(bridge.port);
  try {
    await c.open();
    c.send({ type: 'hello', client: 'UnrealEngine', version: '1.0.0' });
    const first = await c.waitFor((p) => p.type === 'realm_manifest');
    // A renderer that did not subscribe never receives telemetry.
    await new Promise((r) => setTimeout(r, 400));
    c.send(frame(5, { tick: 1 }));
    await new Promise((r) => setTimeout(r, 600));
    assert.equal(c.packets.filter((p) => p.type === 'gpu_telemetry').length, 0, 'gpu_telemetry is opt-in');
    c.send({ type: 'subscribe', streams: ['gpu_telemetry', 'heart_beat'] });
    for (let i = 0; i < 3; i++) c.send(frame(33, { tick: i + 1 }));
    const thinned = await c.waitFor((p) => p.type === 'realm_manifest' && p.payload.gpu_quality < 1);
    assert.ok(bridge.ctx.gpuQuality < 1);
    thinned.payload.layers.forEach((l, i) => assert.ok(l.density < first.payload.layers[i].density || first.payload.layers[i].density === 0));
    assert.equal(bridge.ctx.manifest.gpu_quality, undefined, 'authored manifest keeps its densities');

    const telemetry = await c.waitFor((p) => p.type === 'gpu_telemetry');
    assert.equal(telemetry.id, 'onyx:unreal');
    assert.deepEqual(validatePacket(telemetry), []);
    assert.equal(telemetry.payload.tuner.quality, bridge.ctx.gpuQuality);
    assert.equal(bridge.stats.invalid, 0);

    // Malformed telemetry is answered, not silently dropped.
    c.send({ type: 'telemetry', source: 'unreal', tick: 9, gpu: { budget_ms: 16 } });
    const nack = await c.waitFor((p) => p.type === 'ack' && p.payload.command === 'telemetry');
    assert.equal(nack.payload.ok, false);
    assert.match(nack.payload.error, /frame_ms/);

    // Pinning overrides the tuner.
    c.send({ type: 'command', name: 'set_quality', args: { scale: 0.65 } });
    const pinned = await c.waitFor((p) => p.type === 'ack' && p.payload.command === 'set_quality');
    assert.equal(pinned.payload.quality, 0.65);
    assert.equal(bridge.ctx.gpuQuality, 0.65);
  } finally {
    c.close();
    await bridge.close();
  }
});

const sidecarExe = fileURLToPath(new URL('../../gpu/build/bin/primordia_realmd.exe', import.meta.url));

test('the Vulkan sidecar closes the loop: realm in, Onyx telemetry out', { skip: !existsSync(sidecarExe) && 'gpu engine not built (realm-bridge/gpu/build.ps1)', timeout: 60000 }, async () => {
  const lines = [];
  const bridge = await createBridge({ port: 0, log: (l) => lines.push(l), evolveSeconds: 0, validate: true, gpuSidecar: sidecarExe, gpuSidecarArgs: ['--actors', '256', '--telemetry-hz', '8'] });
  const c = client(bridge.port);
  try {
    await c.open();
    c.send({ type: 'subscribe', streams: ['gpu_telemetry'] });
    const t = await c.waitFor((p) => p.type === 'gpu_telemetry' && p.id === 'onyx:vulkan-sidecar' && p.payload.gpu.frame_ms > 0, 45000);
    assert.deepEqual(validatePacket(t), []);
    assert.equal(t.payload.realm_id, bridge.ctx.manifest.realm_id, 'the sidecar runs the realm the bridge authored');
    assert.equal(t.payload.actors.count, 256);
    assert.ok(t.payload.gpu.realm_tick_ms > 0, 'MCP compute time');
    assert.ok(t.payload.pipelines['mcp.cognition'], 'per-pipeline pressure');
    assert.equal(t.payload.validation_errors, 0);
    assert.ok(lines.some((l) => l.includes('Vulkan sidecar ready')), lines.join('\n'));

    // Quality flows the other way.
    c.send({ type: 'command', name: 'set_quality', args: { scale: 0.5 } });
    const scaled = await c.waitFor((p) => p.type === 'gpu_telemetry' && p.id === 'onyx:vulkan-sidecar' && p.payload.quality === 0.5, 20000);
    assert.ok(scaled.payload.actors.count <= 130, `simulated actors after quality 0.5: ${scaled.payload.actors.count}`);
  } finally {
    c.close();
    await bridge.close();
  }
  assert.ok(lines.some((l) => l.includes('sidecar exited')), 'sidecar shut down with the bridge');
});
