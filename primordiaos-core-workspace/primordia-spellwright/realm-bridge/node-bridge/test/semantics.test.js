// Description semantics (src/realm/semantics.js): words -> layers, params, metaphysics, offline.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDescription, applySemantics } from '../src/realm/semantics.js';
import { normalizeIntent, intentToManifest } from '../src/realm/design.js';
import { validateManifest } from '../src/realm/prs1.js';

const layerOf = (m, kind) => m.layers.find((l) => l.kind === kind);

test('features become layers and params; specific phrases beat generic ones', () => {
  const r = readDescription('A crimson plain of stone circles beneath a broken ring and the milky way');
  assert.deepEqual(r.want.sort(), ['ground', 'ring', 'sky']);
  assert.equal(r.params.ground.monolith_clusters, 10);
  assert.deepEqual(r.params.ring, { arc: 0.55, gap_count: 4 });
  assert.equal(r.params.sky.band_strength, 0.9);
  assert.equal(r.hue, 0);
  assert.ok(r.understood.some((u) => u.startsWith('"broken ring" -> ring')));
  assert.ok(!r.understood.some((u) => u.startsWith('"ring" ->')), 'the generic word does not match twice');
});

test('negation removes a kind instead of adding it', () => {
  const r = readDescription('spires rising from the desert, no ocean, without stars');
  assert.ok(r.want.includes('spire_field') && r.want.includes('ground'));
  assert.deepEqual(r.avoid.sort(), ['ocean', 'sky']);
  const intent = applySemantics(normalizeIntent({ layers: ['ocean', 'sky', 'ring'] }), r);
  assert.deepEqual(intent.layers, ['ground', 'spire_field', 'ring']);
});

test('quantity words scale the counts of what they qualify', () => {
  assert.equal(readDescription('countless islands').params.ocean.islet_count, 32);
  assert.equal(readDescription('a few islands').params.ocean.islet_count, 7);
  assert.equal(readDescription('a lonely island').params.ocean.islet_count, 2);
  assert.equal(readDescription('countless spires').params.spire_field.spire_clusters, 7);
});

test('mood words clamp the model into range instead of adding to it', () => {
  const calm = readDescription('a calm, serene sanctuary');
  const stormyModel = normalizeIntent({ entropy: 0.9, coherence: 0.2, layers: ['ground'] });
  const fixed = applySemantics(stormyModel, calm);
  assert.ok(fixed.metaphysics.entropy <= 0.3);
  assert.ok(fixed.metaphysics.coherence >= 0.6);
  // A model that already agrees is left alone.
  const agreeing = normalizeIntent({ entropy: 0.1, coherence: 0.8, layers: ['ground'] });
  assert.equal(applySemantics(agreeing, calm).metaphysics.entropy, 0.1);
  // Nightmares darken.
  const n = applySemantics(normalizeIntent({ inversion: 0.1, luminosity: 0.9 }), readDescription('a haunted nightmare'));
  assert.ok(n.metaphysics.inversion >= 0.65 && n.metaphysics.luminosity <= 0.4);
});

test('tempo, colour and structure words', () => {
  const r = readDescription('a frozen emerald kingdom of branching roots');
  assert.equal(r.time, 0.4);
  assert.equal(r.hue, 0.33);
  assert.equal(r.web, 'fractal_tree');
});

test('a described realm becomes a valid manifest that carries the words', () => {
  const description = 'a dark citadel of thorns around a black hole, ringed by an asteroid belt';
  const intent = applySemantics(normalizeIntent({ name: 'Thornmaw', layers: ['ground', 'sky'] }), readDescription(description));
  const m = intentToManifest(intent, 77);
  assert.deepEqual(validateManifest(m), []);
  assert.deepEqual(m.layers.map((l) => l.kind), ['ground', 'spire_field', 'void', 'ring', 'sky']);
  assert.equal(layerOf(m, 'void').params.debris, 0.95);
  assert.equal(layerOf(m, 'ring').params.keystones, 2);
  assert.equal(layerOf(m, 'spire_field').params.falloff, 0.7);
  assert.ok(m.metaphysics.luminosity <= 0.35 && m.metaphysics.inversion >= 0.4);
  // Deterministic.
  const again = intentToManifest(intent, 77);
  delete m.generated_by; delete again.generated_by;
  assert.deepEqual(m, again);
});

test('words never produce out-of-range params or an empty realm', () => {
  const r = readDescription('countless countless mountains terraces ziggurats no ground no ocean');
  const intent = applySemantics(normalizeIntent({ layers: ['ground'] }), r);
  assert.ok(intent.layers.length >= 1);
  assert.deepEqual(validateManifest(intentToManifest(intent, 3)), []);
  assert.deepEqual(readDescription('').want, []);
  assert.deepEqual(readDescription(undefined).understood, []);
});
