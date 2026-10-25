// LLM realm design by compact intent, tested offline against a fake Ollama
// that speaks the same streamed NDJSON as the real /api/chat.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import WebSocket from 'ws';
import { createBridge } from '../src/server.js';
import { designRealm, intentToManifest, normalizeIntent, INTENT_SCHEMA } from '../src/realm/design.js';
import { genesis, validateManifest } from '../src/realm/prs1.js';
import { createMetaState } from '../src/state.js';

const INTENT = {
  name: 'Glass Bell Sea',
  entropy: 0.15, luminosity: 0.85, coherence: 0.9, resonance: 0.7, inversion: 0.05, lucidity: 0.8,
  time: 0.6, hue: 0.55,
  layers: ['ocean', 'sky', 'ring'],
  web: 'toroidal',
};

/** Fake Ollama: streams `reply` in small chunks, then a done line with timings. */
function fakeOllama(reply, { status = 200, error } = {}) {
  const requests = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      requests.push(JSON.parse(body));
      res.writeHead(status, { 'Content-Type': 'application/x-ndjson' });
      if (error) return res.end(JSON.stringify({ error }) + '\n');
      const text = typeof reply === 'string' ? reply : JSON.stringify(reply);
      for (let i = 0; i < text.length; i += 7) {
        res.write(JSON.stringify({ message: { role: 'assistant', content: text.slice(i, i + 7) }, done: false }) + '\n');
      }
      res.end(JSON.stringify({ done: true, done_reason: 'stop', eval_count: 61, eval_duration: 8.5e9, prompt_eval_count: 230, prompt_eval_duration: 1e9, load_duration: 0 }) + '\n');
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, requests, url: `http://127.0.0.1:${server.address().port}` })));
}

test('an intent expands into a valid manifest that honours every choice', () => {
  const m = intentToManifest(normalizeIntent(INTENT), 1234);
  assert.deepEqual(validateManifest(m), []);
  assert.equal(m.realm_name, 'Glass Bell Sea');
  assert.deepEqual(m.layers.map((l) => l.kind), ['ocean', 'sky', 'ring']);
  assert.equal(m.topology.kind, 'toroidal');
  assert.equal(m.metaphysics.coherence, 0.9);
  assert.equal(m.metaphysics.time_dilation, 0.6);
  assert.ok(m.glyphs.some((g) => g.kind === 'soul'));
  // Deterministic: same intent + seed -> same realm.
  const again = intentToManifest(normalizeIntent(INTENT), 1234);
  delete m.generated_by; delete again.generated_by;
  assert.deepEqual(m, again);
});

test('sloppy intents are clamped and defaulted', () => {
  const n = normalizeIntent({ name: '', entropy: 7, lucidity: -1, time: 99, hue: 'blue', layers: ['nebula'], web: 'hypercube' });
  assert.equal(n.name, null);
  assert.equal(n.metaphysics.entropy, 1);
  assert.equal(n.metaphysics.lucidity, 0);
  assert.equal(n.time, 4);
  assert.deepEqual(n.layers, ['ground', 'sky']);
  assert.equal(n.web, null);
  assert.deepEqual(validateManifest(intentToManifest(n, 5)), []);
});

test('a design does not disturb undesigned genesis', () => {
  const a = genesis(0x5eed1e55, createMetaState());
  const b = genesis(0x5eed1e55, createMetaState(), null);
  delete a.generated_by; delete b.generated_by;
  assert.deepEqual(a, b);
});

test('designRealm streams from Ollama with the compact schema', async () => {
  const fake = await fakeOllama(INTENT);
  try {
    let chunks = 0;
    const { manifest, intent, stats } = await designRealm('a calm sea of glass bells', { url: fake.url, model: 'fake:1b', onToken: () => chunks++ });
    assert.ok(chunks > 5, 'tokens streamed');
    assert.equal(manifest.realm_name, 'Glass Bell Sea');
    assert.equal(intent.web, 'toroidal');
    assert.equal(stats.genTokens, 61);
    const req = fake.requests[0];
    assert.equal(req.model, 'fake:1b');
    assert.equal(req.stream, true);
    assert.deepEqual(req.format, INTENT_SCHEMA);
    assert.equal(req.messages[1].content, 'a calm sea of glass bells');
  } finally {
    fake.server.close();
  }
});

test('Ollama errors surface with a hint', async () => {
  const fake = await fakeOllama(null, { status: 404, error: "model 'nope' not found" });
  try {
    await assert.rejects(designRealm('x', { url: fake.url, model: 'nope' }), /not found.*ollama pull nope/);
  } finally {
    fake.server.close();
  }
  await assert.rejects(designRealm('x', { url: 'http://127.0.0.1:1', model: 'm' }), /Cannot reach Ollama/);
});

test('bridge generate_realm: ack started -> new manifest -> ack done', async () => {
  const fake = await fakeOllama(INTENT);
  const bridge = await createBridge({ port: 0, log: () => {}, evolveSeconds: 0, ollamaUrl: fake.url, realmModel: 'fake:1b' });
  try {
    const events = await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${bridge.port}`);
      const seen = [];
      let initialRealm = null;
      ws.on('error', reject);
      ws.on('message', (raw) => {
        const p = JSON.parse(raw);
        if (p.type === 'realm_manifest') {
          // The starting realm can arrive twice (on connect + first tick); only the new one matters.
          initialRealm ??= p.payload.realm_id;
          if (p.payload.realm_id !== initialRealm) seen.push(`manifest:${p.payload.realm_name}`);
        }
        if (p.type === 'ack' && p.payload.command === 'generate_realm') {
          seen.push(`ack:${p.payload.status ?? p.payload.error}`);
          if (p.payload.status === 'done' || p.payload.status === 'failed') { ws.close(); resolve({ seen, done: p.payload }); }
        }
      });
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'command', name: 'generate_realm', args: { description: 'a calm sea of glass bells' } }));
        ws.send(JSON.stringify({ type: 'command', name: 'generate_realm', args: { description: 'second, while busy' } }));
      });
    });
    // Second request is rejected while the first is in flight; the manifest precedes "done".
    assert.deepEqual(events.seen, ['ack:started', 'ack:a realm is already being designed', 'manifest:Glass Bell Sea', 'ack:done']);
    assert.equal(events.done.realm_name, 'Glass Bell Sea');
    assert.equal(events.done.tokens, 61);
    assert.equal(bridge.ctx.manifest.realm_name, 'Glass Bell Sea');
  } finally {
    await bridge.close();
    fake.server.close();
  }
});
