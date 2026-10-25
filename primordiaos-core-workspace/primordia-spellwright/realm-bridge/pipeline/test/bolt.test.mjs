import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { startBolt, configFromEnv } from '../bolt/server.mjs';
import { checkGCode } from '../bolt/workers.mjs';
import { FrameParser, encodeFrame, acceptKey } from '../lib/websocket.mjs';
import { JobStore } from '../lib/jobs.mjs';
import { api, tempDir, wsConnect } from './helpers.mjs';

const GCODE = `%
O1001 (PRIMORDIA PLATE)
G21 G90 G94 G17 G40 G49 G80
T1 M06
S18000 M03
G00 Z5.000
G00 X10.000 Y10.000
G01 Z-1.000 F300
G01 X20.000 F900
G00 Z5.000
M05
M30
%
`;

function boltConfig(dir, extra = {}) {
  return {
    ...configFromEnv({}),
    port: 0,
    eventsPort: 0,
    dataDir: dir,
    spoolDir: join(dir, 'spool'),
    blenderExe: null,
    blenderPort: 1, // nothing listens there
    autobuilderUrl: 'http://127.0.0.1:1',
    quiet: true,
    ...extra,
  };
}

test('websocket frames round-trip through the parser, split anywhere', () => {
  const big = Buffer.alloc(70000, 7);
  const frames = Buffer.concat([encodeFrame(1, Buffer.from('hi')), encodeFrame(2, big), encodeFrame(9)]);
  const p = new FrameParser();
  const out = [];
  for (let i = 0; i < frames.length; i += 999) out.push(...p.push(frames.subarray(i, i + 999)));
  assert.equal(out.length, 3);
  assert.equal(out[0].payload.toString(), 'hi');
  assert.equal(out[1].payload.length, 70000);
  assert.equal(out[2].opcode, 9);
  // RFC 6455 section 1.3 example
  assert.equal(acceptKey('dGhlIHNhbXBsZSBub25jZQ=='), 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=');
});

test('job store validates, dedupes ids, and never changes a finished job', () => {
  const s = new JobStore();
  assert.throws(() => s.create({ kind: 'nodot' }), /invalid job kind/);
  assert.throws(() => s.create({ id: 'bad id!', kind: 'a.b' }), /invalid job id/);
  const { job } = s.create({ id: 'j1', kind: 'cadcam.fabricate' });
  assert.equal(s.create({ id: 'j1', kind: 'cadcam.fabricate' }).created, false);
  s.update('j1', { status: 'failed', error: 'x' });
  s.update('j1', { status: 'succeeded' });
  assert.equal(job.status, 'failed');
});

test('G-code checks catch missing units, spindle and end', () => {
  assert.deepEqual(checkGCode(GCODE).problems, []);
  const bad = checkGCode('G0 X1\nG1 Y2 F100\n');
  assert.ok(bad.problems.some((p) => p.includes('G21')));
  assert.ok(bad.problems.some((p) => p.includes('M3')));
  assert.ok(bad.problems.some((p) => p.includes('M30')));
});

test('bolt: submit, events, spool, allow-list, cancel, auth', async () => {
  const dir = tempDir('bolt-');
  const allow = join(dir, 'allow.json');
  writeFileSync(allow, JSON.stringify({ allowed_tasks: ['cadcam.fabricate', 'spell.cast', 'blender.*'] }));
  const bolt = await startBolt(boltConfig(dir, { allowlistFile: allow, key: 'k3y' }));
  const H = { 'X-Bolt-Key': 'k3y' };
  try {
    assert.equal((await api(bolt.port, '/health')).status, 401);
    const health = await api(bolt.port, '/health', { headers: H });
    assert.equal(health.body.ok, true);

    await assert.rejects(wsConnect(bolt.eventsPort), /401/);
    const ws = await wsConnect(bolt.eventsPort, '/events', H);
    await ws.waitFor((m) => m.type === 'hello');

    // Fabrication: spooled, with events all the way to succeeded.
    const sub = await api(bolt.port, '/jobs', { method: 'POST', headers: H, body: { id: 'ue-1', kind: 'cadcam.fabricate', payload: { name: 'plate', gcode: GCODE, gcodeFile: 'plate.nc', simulation: { ok: true, machiningSeconds: 42 } } } });
    assert.equal(sub.status, 201);
    const done = await ws.waitFor((m) => m.type === 'job.updated' && m.job.id === 'ue-1' && m.job.status === 'succeeded');
    assert.ok(existsSync(done.job.result.spoolPath));
    assert.equal(readFileSync(done.job.result.spoolPath, 'utf8'), GCODE);
    assert.equal(done.job.result.machiningSeconds, 42);

    // Resubmitting the same id is idempotent.
    assert.equal((await api(bolt.port, '/jobs', { method: 'POST', headers: H, body: { id: 'ue-1', kind: 'cadcam.fabricate', payload: {} } })).status, 200);

    // A program that never ends is refused by the worker.
    await api(bolt.port, '/jobs', { method: 'POST', headers: H, body: { id: 'ue-2', kind: 'cadcam.fabricate', payload: { gcode: 'G21 G90\nM3\nG1 X1 F100\n' } } });
    const bad = await ws.waitFor((m) => m.type === 'job.updated' && m.job.id === 'ue-2' && m.job.status === 'failed');
    assert.match(bad.job.error, /M30/);

    // Spell telemetry is broadcast on the spell topic.
    await api(bolt.port, '/jobs', { method: 'POST', headers: H, body: { kind: 'spell.cast', payload: { schema: 'primordia.spell/1', spell: { id: 's', name: 'fabricate', steps: [{ op: 'cadcam.fabricate' }] } } } });
    const cast = await ws.waitFor((m) => m.type === 'spell.cast');
    assert.deepEqual(cast.spell.steps, ['cadcam.fabricate']);

    // Not on the allow-list.
    const refused = await api(bolt.port, '/jobs', { method: 'POST', headers: H, body: { kind: 'davinci.render', payload: {} } });
    assert.equal(refused.status, 403);

    // Blender is not running and may not be launched: the job fails with a clear reason.
    await api(bolt.port, '/jobs', { method: 'POST', headers: H, body: { id: 'ue-3', kind: 'blender.render', payload: { method: 'render', params: {} } } });
    const noBlender = await ws.waitFor((m) => m.type === 'job.updated' && m.job.id === 'ue-3' && m.job.status === 'failed');
    assert.match(noBlender.job.error, /BLENDER_EXE/);

    // Cancel a job that is still queued behind nothing: create then cancel immediately.
    const c = await api(bolt.port, '/jobs/ue-1/cancel', { method: 'POST', headers: H });
    assert.equal(c.body.job.status, 'succeeded', 'a finished job stays finished');

    // External events are re-broadcast, job events cannot be forged.
    assert.equal((await api(bolt.port, '/events', { method: 'POST', headers: H, body: { type: 'job.updated' } })).status, 400);
    await api(bolt.port, '/events', { method: 'POST', headers: H, body: { type: 'build.started', build: { id: 'b1' } } });
    await ws.waitFor((m) => m.type === 'build.started' && m.build.id === 'b1');

    const listed = await api(bolt.port, '/jobs?kind=cadcam', { headers: H });
    assert.equal(listed.body.jobs.length, 2);
    ws.close();
  } finally {
    await bolt.close();
  }
});

test('bolt: autobuilder jobs follow the build to the end', async () => {
  // A fake Autobuilder: accepts a build, reports running once, then succeeded.
  let polls = 0;
  const fake = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'POST' && req.url === '/build') return res.end(JSON.stringify({ build: { id: 'b-1', status: 'queued' } }));
    if (req.url === '/builds/b-1') return res.end(JSON.stringify({ build: { id: 'b-1', status: ++polls > 1 ? 'succeeded' : 'running', seconds: 3, summary: 'plugin built' } }));
    res.statusCode = 404;
    res.end('{}');
  });
  await new Promise((r) => fake.listen(0, '127.0.0.1', r));
  const dir = tempDir('bolt-ab-');
  const bolt = await startBolt(boltConfig(dir, { allowlistFile: null, autobuilderUrl: `http://127.0.0.1:${fake.address().port}` }));
  try {
    const ws = await wsConnect(bolt.eventsPort);
    await api(bolt.port, '/jobs', { method: 'POST', body: { id: 'ab', kind: 'autobuilder.build', payload: { reason: 'test', mode: 'plugin' } } });
    const done = await ws.waitFor((m) => m.type === 'job.updated' && m.job.id === 'ab' && (m.job.status === 'succeeded' || m.job.status === 'failed'), 15000);
    assert.equal(done.job.status, 'succeeded');
    assert.equal(done.job.result.summary, 'plugin built');
    ws.close();
  } finally {
    await bolt.close();
    fake.close();
  }
});

test('bolt: odd paths and stray WebSocket clients never crash the server', async () => {
  const { connect } = await import('node:net');
  const dir = tempDir('bolt-odd-');
  const bolt = await startBolt(boltConfig(dir, { allowlistFile: null }));
  const raw = (port, text) => new Promise((resolve) => {
    const s = connect(port, '127.0.0.1', () => s.write(text));
    let out = '';
    s.on('data', (d) => (out += d));
    s.on('close', () => resolve(out));
    s.on('error', () => resolve(out));
    setTimeout(() => s.destroy(), 2000).unref();
  });
  try {
    // What the realm-bridge plugin sends: a WebSocket upgrade for "//" on the REST port.
    const upgrade = 'GET // HTTP/1.1\r\nHost: 127.0.0.1\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n';
    assert.match(await raw(bolt.port, upgrade), /400/);
    assert.match(await raw(bolt.port, 'GET //x HTTP/1.1\r\nHost: a\r\nConnection: close\r\n\r\n'), /404/);
    assert.match(await raw(bolt.eventsPort, upgrade), /400/);
    assert.equal((await api(bolt.port, '/health')).body.ok, true, 'still alive');
  } finally {
    await bolt.close();
  }
});

test('bolt: a busy port gives an actionable error', async () => {
  const blocker = createServer(() => {});
  await new Promise((r) => blocker.listen(0, '127.0.0.1', r));
  const dir = tempDir('bolt-port-');
  await assert.rejects(startBolt(boltConfig(dir, { port: blocker.address().port, allowlistFile: null })), /already in use/);
  blocker.close();
});
