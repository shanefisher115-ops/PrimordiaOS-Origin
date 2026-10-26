import test from 'node:test';
import assert from 'node:assert/strict';
import { createBridge } from '../src/server.js';
import { validatePacket } from '../src/schemas.js';
import { validateManifest } from '../src/realm/prs1.js';
import { createArchipelago, skyBridges, BIOMES } from '../src/realm/archipelago.js';
import { session } from './helpers.js';

const home = { realm_id: 'realm-home', realm_name: 'Lumenne Hollow', bounds: { radius: 120 } };

test('an archipelago is deterministic, spaced, walkable and fully connected', () => {
  const a = createArchipelago(1234, home);
  const strip = (w) => JSON.parse(JSON.stringify(w, (k, v) => (k === 'at' ? undefined : v))); // manifests carry a generation timestamp
  assert.deepEqual(strip(a), strip(createArchipelago(1234, home)));
  assert.notDeepEqual(a.islands.map((i) => i.position), createArchipelago(99, home).islands.map((i) => i.position));
  assert.equal(a.islands[0].home, true);
  assert.deepEqual(a.islands[0].position, [0, 0, 0]);
  for (const [i, p] of a.islands.entries()) {
    for (const q of a.islands.slice(i + 1)) assert.ok(Math.hypot(p.position[0] - q.position[0], p.position[1] - q.position[1]) >= 420, 'islands keep their distance');
    if (p.home) continue;
    assert.deepEqual(validateManifest(p.manifest), [], p.name);
    assert.equal(p.manifest.layers[0].kind, 'ground', 'every island can be walked');
    assert.equal(p.species.length, 2);
  }
  // Biomes are dealt without repeats until the deck runs out.
  const biomes = a.islands.slice(1, 1 + BIOMES.length).map((i) => i.biome);
  assert.equal(new Set(biomes).size, Math.min(BIOMES.length, a.islands.length - 1));
  // The bridges connect every island to home.
  const seen = new Set(['home']);
  let grew = true;
  while (grew) {
    grew = false;
    for (const { a: x, b: y } of a.bridges) if (seen.has(x) !== seen.has(y)) { seen.add(x); seen.add(y); grew = true; }
  }
  assert.equal(seen.size, a.islands.length);
});

test('sky-bridges: a spanning tree plus the shortest extra links', () => {
  const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }, { x: 10, y: 10 }];
  const edges = skyBridges(pts, 1);
  assert.equal(edges.length, 4); // 3 tree edges + 1 extra
  assert.deepEqual(skyBridges(pts, 0).length, 3);
});

test('the bridge sends the world on connect and streams island species', async () => {
  const bridge = await createBridge({ port: 0, log: () => {}, evolveSeconds: 0, validate: true, sovereignDir: null, archipelagoIslands: 5 });
  try {
    let world = null;
    const species = new Map();
    await session(bridge.port, [], (p) => {
      if (p.type === 'world_manifest') world = p;
      if (p.type === 'species') species.set(p.id, p);
      return world && species.size >= 8;
    });
    assert.deepEqual(validatePacket(world), []);
    assert.equal(world.payload.islands.length, 5);
    assert.equal(world.payload.islands[0].manifest, undefined, 'the home island streams as the live realm');
    assert.ok(world.payload.islands[1].manifest.layers.length >= 2);
    for (const p of species.values()) {
      assert.deepEqual(validatePacket(p), [], p.id);
      const isle = world.payload.islands.find((i) => i.id === p.payload.island);
      assert.ok(Math.hypot(p.payload.position[0] - isle.position[0], p.payload.position[1] - isle.position[1]) < isle.radius * 2, 'species live on their island');
    }
  } finally {
    await bridge.close();
  }
});
