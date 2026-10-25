import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createBridge } from '../src/server.js';
import { validatePacket } from '../src/schemas.js';
import { applyCycle, createChronicle, cyclePrompt, ecologyOf, normalizeCycle, wavFile } from '../src/sovereign/sovereign.js';
import { fakeOllama, fakeTtsFactory, session } from './helpers.js';

const quiet = () => {};

const CYCLE = {
  narration: 'The light leans. Every stone learns its shadow, and the wisps walk around it.',
  title: 'When the Light Leaned',
  metaphysics: [{ key: 'luminosity', value: 0.85 }, { key: 'entropy', value: 7 }, { key: 'gravity', value: 1 }],
  evolve: true,
  species: [
    { name: 'Lumenwisp', archetype: 'Collective', population: 1800, trait: 'fear-reactive hue', look: 'glowing motes' },
    { name: 'Spireborn Choir', archetype: 'Elemental', population: 64, trait: 'burning crowns', look: 'rose quartz spires' },
  ],
  event: { name: 'The Turning of the Sun', kind: 'cosmic', description: 'The sun swings to the side of the world.' },
  lore: { title: 'The Light Learned to Lean', text: 'In the age before, nothing had a shadow.' },
  fab_assets: ['firefly swarm VFX', 'crystal spire kit'],
};

test('normalizeCycle clamps metaphysics and drops what the realm cannot use', () => {
  const c = normalizeCycle({ ...CYCLE, species: [...CYCLE.species, { name: 'lumenwisp', archetype: 'Wizard', population: -5 }, { name: '' }] });
  assert.deepEqual(c.metaphysics, [{ key: 'luminosity', value: 0.85 }, { key: 'entropy', value: 1 }]); // gravity is not a quality
  assert.equal(c.species.length, 2); // the duplicate (any case) and the nameless one are gone
  assert.equal(c.evolve, true);
  assert.equal(c.event.kind, 'cosmic');
  const empty = normalizeCycle('not json');
  assert.deepEqual([empty.metaphysics, empty.species, empty.event, empty.lore, empty.evolve], [[], [], null, null, false]);
  assert.equal(empty.title, 'A Quiet Turning');
});

test('the chronicle merges species by name, records extinction and keeps the largest eight', () => {
  const chron = createChronicle();
  let evo = applyCycle(chron, normalizeCycle(CYCLE), { number: 1, realm: 'Lumenne Hollow' });
  assert.deepEqual(evo.map((e) => [e.name, e.status, e.change]), [['Lumenwisp', 'emerged', 1800], ['Spireborn Choir', 'emerged', 64]]);
  evo = applyCycle(chron, normalizeCycle({ species: [
    { name: 'LUMENWISP', archetype: 'Collective', population: 1500, trait: 'longer memory', look: '' },
    { name: 'Spireborn Choir', archetype: 'Elemental', population: 0, trait: '', look: '' },
  ] }), { number: 2, realm: 'Lumenne Hollow' });
  assert.deepEqual(evo.map((e) => [e.status, e.change]), [['evolved', -300], ['extinct', -64]]);
  assert.deepEqual(chron.species.map((s) => s.name), ['Lumenwisp']);
  assert.deepEqual(chron.species[0].traits, ['fear-reactive hue', 'longer memory']);
  assert.equal(chron.species[0].look, 'glowing motes'); // an empty look keeps the old one
  for (let i = 0; i < 10; i++) {
    applyCycle(chron, normalizeCycle({ species: [{ name: `S${i}`, archetype: 'Fungal', population: 10 + i, trait: 't', look: 'l' }] }), { number: 3 + i, realm: '' });
  }
  assert.equal(chron.species.length, 8);
  assert.equal(chron.species[0].name, 'Lumenwisp');
  assert.equal(chron.cycle, 12);
  const eco = ecologyOf(chron, { coherence: 0.6, entropy: 0.35 });
  assert.equal(eco.species_count, 8);
  assert.ok(eco.diversity > 0 && eco.diversity < 1);
  assert.match(cyclePrompt(chron, 13, 'Current realm: "X".'), /Cycle 13\.[\s\S]*Lumenwisp \(Collective, 1500; longer memory\)/);
  assert.match(cyclePrompt(createChronicle(), 1, ''), /bring forth the first species[\s\S]*first dawn/);
});

test('wavFile writes a valid 16-bit mono header', () => {
  const wav = wavFile(Buffer.alloc(48000), 24000);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.readUInt32LE(24), 24000);
  assert.equal(wav.readUInt32LE(40), 48000);
  assert.equal(wav.length, 44 + 48000);
});

test('a Sovereign cycle speaks as a narrator, changes the realm and keeps a chronicle', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sovereign-'));
  const fake = await fakeOllama(CYCLE, { delayMs: 5 });
  const bridge = await createBridge({
    port: 0, log: quiet, evolveSeconds: 0, validate: true,
    ollamaUrl: fake.url, sovereignModel: 'fake:1b', sovereignDir: dir, sovereignVoice: 'bf_emma', ttsFactory: fakeTtsFactory,
  });
  try {
    let sawCycle = false;
    let sawFinal = false;
    const packets = await session(bridge.port, [
      { type: 'hello', client: 'test', streams: ['sovereign_cycle'] },
      { type: 'command', name: 'sovereign', args: { op: 'cycle' } },
    ], (p) => {
      if (p.type === 'sovereign_cycle') sawCycle = true;
      if (p.type === 'voice' && p.payload.final) sawFinal = true;
      return sawCycle && sawFinal;
    });
    const voice = packets.filter((p) => p.type === 'voice');
    assert.ok(voice.length > 1);
    assert.ok(voice.every((p) => p.id === 'voice:sovereign' && p.payload.spatial === false), 'the Sovereign is a narrator heard everywhere');
    assert.deepEqual(voice.filter((p) => p.payload.text).map((p) => p.payload.text), ['The light leans.', 'Every stone learns its shadow, and the wisps walk around it.']);
    const cycle = packets.find((p) => p.type === 'sovereign_cycle');
    assert.deepEqual(validatePacket(cycle), []);
    assert.equal(cycle.payload.cycle, 1);
    assert.deepEqual(cycle.payload.changes, ['luminosity = 0.85', 'entropy = 1', 'realm evolving']);
    assert.equal(cycle.payload.ecology.total_population, 1864);
    assert.ok(Math.abs(bridge.ctx.state.luminosity - 0.85) < 1e-9);
    // The model saw the realm and was asked for the first species.
    assert.match(fake.requests[0].messages[1].content, /Cycle 1\.[\s\S]*Current realm: ".+"[\s\S]*first species/);
    assert.match(fake.requests[0].messages[0].content, /Primordia Sovereign/);

    // The chronicle and the cycle's audio are on disk.
    await new Promise((r) => setTimeout(r, 50));
    const chron = JSON.parse(fs.readFileSync(path.join(dir, 'chronicle.json'), 'utf8'));
    assert.equal(chron.cycle, 1);
    assert.deepEqual(chron.species.map((s) => s.name), ['Lumenwisp', 'Spireborn Choir']);
    assert.equal(fs.readFileSync(path.join(dir, 'cycles.jsonl'), 'utf8').trim().split('\n').length, 1);
    const wav = fs.readFileSync(path.join(dir, 'cycle-0001.wav'));
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.ok(wav.length > 44 + 1000);

    // Renderers that did not ask for sovereign_cycle get the voice but not the record.
    const plain = await session(bridge.port, [{ type: 'command', name: 'sovereign', args: { op: 'status' } }], (p) => p.type === 'ack' && p.payload.command === 'sovereign');
    const status = plain.at(-1).payload;
    assert.equal(status.ok, true);
    assert.equal(status.cycle, 1);
    assert.equal(status.enabled, false);
    assert.equal(status.last.wav, path.join(dir, 'cycle-0001.wav'));
  } finally {
    await bridge.close();
    fake.server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a new bridge continues the chronicle from disk', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sovereign-'));
  fs.writeFileSync(path.join(dir, 'chronicle.json'), JSON.stringify({ cycle: 41, species: [{ name: 'Cloudgrazer', archetype: 'Photosynthetic', population: 320, traits: ['membrane sails'], look: '' }], events: [], lore: [] }));
  const fake = await fakeOllama(CYCLE);
  const bridge = await createBridge({ port: 0, log: quiet, evolveSeconds: 0, ollamaUrl: fake.url, sovereignDir: dir, ttsFactory: fakeTtsFactory });
  try {
    await session(bridge.port, [
      { type: 'hello', client: 'test', streams: ['sovereign_cycle'] },
      { type: 'command', name: 'sovereign', args: { op: 'cycle' } },
    ], (p) => p.type === 'sovereign_cycle');
    assert.match(fake.requests[0].messages[1].content, /Cycle 42\.[\s\S]*Cloudgrazer \(Photosynthetic, 320; membrane sails\)/);
  } finally {
    await bridge.close();
    fake.server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('species incarnate deterministically, by archetype, with bodies that follow the population', async () => {
  const { incarnate, bodiesFor, createIncarnations, slug } = await import('../src/sovereign/incarnation.js');
  const manifest = { layers: [{ kind: 'ground', radius: 120, altitude: 0 }] };
  const wisp = { name: 'Echo-Swarm', archetype: 'Collective', population: 23, traits: ['wave motion'], look: 'blue motes' };
  const a = incarnate(wisp, manifest, 3);
  assert.deepEqual(a, incarnate(wisp, manifest, 3)); // same species, same realm -> same incarnation
  assert.equal(a.manifestation, 'swarm');
  assert.ok(Math.hypot(a.position[0], a.position[1]) <= 120 * 0.72 + 1e-9, 'home lies on the ground');
  assert.equal(incarnate({ name: 'Lumen-Seed', archetype: 'Photosynthetic', population: 13 }, manifest).manifestation, 'rooted');
  assert.equal(incarnate({ name: 'Gravemind', archetype: 'Predatory', population: 9 }, manifest).manifestation, 'individual');
  const deep = incarnate({ name: 'Leviathan', archetype: 'Abyssal', population: 3 }, manifest);
  assert.equal(deep.manifestation, 'abyssal');
  assert.ok(deep.position[2] < -40, 'abyssal species live in the cloud sea under the realm');
  assert.equal(incarnate({ name: 'X', archetype: 'Wizard', population: 1 }, manifest).manifestation, 'floating'); // unknown -> Elemental
  // Bodies: logarithmic, capped, never more than the population.
  assert.equal(bodiesFor(0, 60), 0);
  assert.equal(bodiesFor(3, 60), 3);
  assert.ok(bodiesFor(1800, 400) > bodiesFor(23, 400));
  assert.equal(bodiesFor(10_000_000, 24), 24);
  assert.equal(slug('Spireborn Choir!'), 'spireborn-choir');

  const inc = createIncarnations();
  const chron = { cycle: 1, species: [wisp, { name: 'Gravemind', archetype: 'Predatory', population: 9 }] };
  assert.deepEqual(inc.packets(chron, manifest).map((p) => [p.id, p.op ?? 'upsert']), [['species:echo-swarm', 'upsert'], ['species:gravemind', 'upsert']]);
  chron.species = [wisp];
  assert.deepEqual(inc.packets(chron, manifest).map((p) => [p.id, p.op ?? 'upsert']), [['species:echo-swarm', 'upsert'], ['species:gravemind', 'retire']]);
  assert.deepEqual(inc.retireAll().map((p) => [p.id, p.op]), [['species:echo-swarm', 'retire']]);
});

test('after a cycle the bridge streams each species as a valid entity', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sovereign-'));
  const fake = await fakeOllama(CYCLE);
  const bridge = await createBridge({ port: 0, log: quiet, evolveSeconds: 0, validate: true, ollamaUrl: fake.url, sovereignDir: dir, ttsFactory: fakeTtsFactory });
  try {
    const seen = new Map();
    await session(bridge.port, [{ type: 'command', name: 'sovereign', args: { op: 'cycle' } }], (p) => {
      if (p.type === 'species') seen.set(p.id, p);
      return seen.size === 2;
    });
    assert.deepEqual([...seen.keys()].sort(), ['species:lumenwisp', 'species:spireborn-choir']);
    for (const p of seen.values()) assert.deepEqual(validatePacket(p), [], p.id);
    const wisp = seen.get('species:lumenwisp').payload;
    assert.equal(wisp.manifestation, 'swarm');
    assert.equal(wisp.population, 1800);
    assert.ok(wisp.bodies > 100 && wisp.bodies <= 400);
  } finally {
    await bridge.close();
    fake.server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
