// Offline tests for the realm-design repair rules shared with PrimordiaOllamaRealm.cpp.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { repairManifest, fnv1a } from '../examples/ollama-realm-repair.js';
import { validateManifest } from '../src/realm/prs1.js';

test('garbage input still yields a valid PRS-1 manifest', () => {
  for (const raw of [null, {}, { layers: 'nope', glyphs: 7 }, { realm_name: '   ' }]) {
    const { manifest, repairs } = repairManifest(raw);
    assert.deepEqual(validateManifest(manifest), [], JSON.stringify(raw));
    assert.ok(repairs.includes('added ground layer'));
    assert.ok(repairs.includes('added soul glyph'));
    assert.equal(manifest.glyphs.filter((g) => g.kind === 'soul').length, 1);
  }
});

test('out-of-range model output is clamped, unknown kinds dropped, ids assigned', () => {
  const { manifest, repairs } = repairManifest({
    realm_name: 'Glass Bells',
    metaphysics: { entropy: 1.7, luminosity: -2, coherence: 0.5, resonance: 0.5, inversion: 0.5, lucidity: 1.5, time_dilation: 99, essence: [9, 0.5, -1] },
    layers: [
      { kind: 'ocean', altitude: 0, radius: 900, density: 0.4, palette: [[0.2, 0.4, 0.9]], params: { wave_height: 3, star_count: 5 } },
      { kind: 'nebula', altitude: 10, radius: 50, density: 0.5, palette: [], params: {} },
      { kind: 'sky', density: 0.8, palette: [[1, 1, 1], [0, 0, 0.2]], params: { star_count: 99999.4 } },
    ],
    topology: { kind: 'hypercube', node_count: 3000, edge_density: 0.3 },
    glyphs: [
      { kind: 'soul', position: [0, 0, 14], scale: 6, symmetry: 6, complexity: 0.5, hue: 0.6 },
      { kind: 'soul', position: [500, 0, 0], scale: 40, symmetry: 0, complexity: 0.5, hue: 2 },
    ],
  });
  assert.deepEqual(validateManifest(manifest), []);
  assert.equal(manifest.metaphysics.entropy, 1);
  assert.equal(manifest.metaphysics.luminosity, 0);
  assert.equal(manifest.metaphysics.time_dilation, 4);
  assert.deepEqual(manifest.metaphysics.essence, [2, 0.5, 0]);
  assert.deepEqual(manifest.layers.map((l) => l.id), ['ocean-0', 'sky-1']);
  assert.equal(manifest.layers[0].radius, 400);
  assert.equal(manifest.layers[0].palette.length, 2);
  assert.deepEqual(manifest.layers[0].params, { wave_height: 3 }); // star_count is not an ocean param
  assert.equal(manifest.layers[1].altitude, 80);                  // sky default
  assert.equal(manifest.layers[1].params.star_count, 5000);
  assert.equal(manifest.topology.kind, 'small_world');
  assert.equal(manifest.topology.node_count, 128);
  assert.deepEqual(manifest.glyphs.map((g) => g.kind), ['soul', 'sigil']);
  assert.deepEqual(manifest.glyphs[1].position, [60, 0, 0]);
  assert.equal(manifest.glyphs[1].scale, 10);
  assert.equal(manifest.glyphs[1].symmetry, 1);
  assert.ok(repairs.some((r) => r.startsWith('dropped 1 layer')));
});

test('composition params are kept per kind and clamped', () => {
  const { manifest, repairs } = repairManifest({
    realm_name: 'Broken Crowns',
    layers: [
      { kind: 'ground', params: { roughness: 0.5, monolith_clusters: 40.6, cluster_spread: 0.2, rubble: 0.4, keystones: 3 } },
      { kind: 'ring', params: { keystones: 7.4, gap_count: 9, arc: 0 } },
      { kind: 'spire_field', params: { spire_clusters: 0, falloff: 2.5, debris: 1 } },
    ],
  });
  assert.deepEqual(validateManifest(manifest), []);
  assert.deepEqual(manifest.layers[0].params, { roughness: 0.5, monolith_clusters: 24, cluster_spread: 1, rubble: 0.4 }); // keystones is a ring param
  assert.deepEqual(manifest.layers[1].params, { keystones: 7, gap_count: 6, arc: 0.05 });
  assert.deepEqual(manifest.layers[2].params, { spire_clusters: 1, falloff: 2.5 });
  assert.ok(repairs.includes('layers[0].params.monolith_clusters clamped 40.6->24'));
});

test('seed comes from the realm name unless overridden', () => {
  assert.equal(repairManifest({ realm_name: 'Glass Bells' }).manifest.seed, fnv1a('Glass Bells'));
  assert.equal(repairManifest({ realm_name: 'Glass Bells' }, 42).manifest.realm_id, 'realm-llm-0000002a');
});
