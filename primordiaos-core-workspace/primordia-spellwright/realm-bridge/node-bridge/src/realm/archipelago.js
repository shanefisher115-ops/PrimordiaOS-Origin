// The archipelago: a procedural world of many realms across the cloud sea (docs/ARCHIPELAGO.md).
//
// One world seed decides everything, deterministically:
//   - island positions: Poisson-disc samples in a disc around the home realm (which stays at the
//     origin), each at its own altitude;
//   - each island's biome (layers, metaphysics, hue, web) and from it a full PRS-1 realm through
//     Worldforge (intentToManifest), with its own seed;
//   - each island's native species (2 per island, archetypes from the biome);
//   - sky-bridges: the minimum spanning tree of the islands plus a few short extra links.
// The bridge sends it all as one `world_manifest` packet; Unreal streams the realms in by distance.
import { intentToManifest } from './design.js';
import { mulberry32, subSeed } from '../prng.js';

/** Biomes: what kind of realm an island is. `layers` always starts with ground (islands are walked). */
export const BIOMES = [
  { biome: 'verdant_spires', label: 'Verdant Spires', hue: 0.32, layers: ['ground', 'spire_field', 'sky'], meta: { luminosity: 0.75, coherence: 0.7, entropy: 0.25 }, archetypes: ['Photosynthetic', 'Collective'] },
  { biome: 'ember_crown', label: 'Ember Crown', hue: 0.04, layers: ['ground', 'ring', 'sky'], meta: { luminosity: 0.8, entropy: 0.6, inversion: 0.15 }, archetypes: ['Elemental', 'Predatory'] },
  { biome: 'frost_lattice', label: 'Frost Lattice', hue: 0.56, layers: ['ground', 'lattice', 'sky'], meta: { luminosity: 0.65, coherence: 0.85, entropy: 0.15 }, archetypes: ['Synthetic', 'Spectral'] },
  { biome: 'dream_hollow', label: 'Dream Hollow', hue: 0.78, layers: ['ground', 'spire_field', 'ring'], meta: { lucidity: 0.85, luminosity: 0.6, coherence: 0.5 }, archetypes: ['Spectral', 'Fungal'] },
  { biome: 'abyssal_reach', label: 'Abyssal Reach', hue: 0.64, layers: ['ground', 'void', 'sky'], meta: { inversion: 0.55, luminosity: 0.4, entropy: 0.45 }, archetypes: ['Abyssal', 'Predatory'] },
  { biome: 'crystal_choir', label: 'Crystal Choir', hue: 0.9, layers: ['ground', 'spire_field', 'lattice'], meta: { resonance: 0.85, coherence: 0.75, luminosity: 0.7 }, archetypes: ['Elemental', 'Collective'] },
  { biome: 'fungal_deep', label: 'Fungal Deep', hue: 0.42, layers: ['ground', 'ring', 'lattice'], meta: { entropy: 0.5, lucidity: 0.7, luminosity: 0.5 }, archetypes: ['Fungal', 'Photosynthetic'] },
];

const SYL_A = ['Vael', 'Sor', 'Ith', 'Mor', 'Lum', 'Cael', 'Thar', 'Ny', 'Esh', 'Ora', 'Ven', 'Ky'];
const SYL_B = ['dris', 'mere', 'aen', 'oth', 'ira', 'vel', 'ast', 'une', 'ok', 'esse', 'yn', 'ar'];
const PLACE = ['Reach', 'Hollow', 'Spire', 'Crown', 'Drift', 'Haven', 'Shoal', 'Vigil', 'Bloom', 'Expanse'];
const BEAST = ['wing', 'drifter', 'stalker', 'choir', 'bloom', 'shade', 'warden', 'mote', 'ray', 'cap'];

const r2 = (v) => Math.round(v * 100) / 100;
const pick = (rng, list) => list[Math.floor(rng() * list.length) % list.length];

function placeIslands(rng, count, worldRadius, minSpacing, homeRadius) {
  const pts = [{ x: 0, y: 0 }];
  let tries = 0;
  while (pts.length < count && tries++ < count * 400) {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * worldRadius;
    const p = { x: r * Math.cos(a), y: r * Math.sin(a) };
    if (Math.hypot(p.x, p.y) < minSpacing + homeRadius * 0.5) continue;
    if (pts.every((q) => Math.hypot(p.x - q.x, p.y - q.y) >= minSpacing)) pts.push(p);
  }
  return pts;
}

/** Minimum spanning tree (Prim) plus `extra` shortest non-tree links, as index pairs. */
export function skyBridges(points, extra = 3, maxExtraLength = Infinity) {
  const n = points.length;
  const d = (i, j) => Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
  const inTree = new Set([0]);
  const edges = [];
  while (inTree.size < n) {
    let best = null;
    for (const i of inTree) for (let j = 0; j < n; j++) {
      if (inTree.has(j)) continue;
      if (!best || d(i, j) < best.len) best = { a: i, b: j, len: d(i, j) };
    }
    inTree.add(best.b);
    edges.push([best.a, best.b]);
  }
  const has = new Set(edges.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`));
  const rest = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (!has.has(`${i}-${j}`) && d(i, j) <= maxExtraLength) rest.push([i, j, d(i, j)]);
  rest.sort((p, q) => p[2] - q[2]);
  for (const [a, b] of rest.slice(0, extra)) edges.push([a, b]);
  return edges;
}

function islandSpecies(rng, biome, islandName) {
  return biome.archetypes.map((archetype, k) => ({
    name: `${pick(rng, SYL_A)}${pick(rng, SYL_B)} ${pick(rng, BEAST)}`.replace(/^\w/, (c) => c.toUpperCase()),
    archetype,
    population: Math.round(20 + rng() * (k === 0 ? 900 : 300)),
    traits: [`native to ${islandName}`],
    look: '',
  }));
}

/**
 * The world. `home` is the live realm's manifest (it stays at the origin and keeps its own story).
 * @returns {{ world_id, seed, name, islands: object[], bridges: object[] }}
 */
export function createArchipelago(seed, home, { count = 12, worldRadius = 1300, minSpacing = 420 } = {}) {
  seed = seed >>> 0;
  const rng = mulberry32(subSeed(seed, 'archipelago'));
  const homeRadius = home?.bounds?.radius ?? 120;
  const pts = placeIslands(rng, count, worldRadius, minSpacing, homeRadius);
  // Biomes are dealt from a seeded shuffle, so a world shows them all before any repeats.
  const deck = BIOMES.map((_, k) => k);
  for (let k = deck.length - 1; k > 0; k--) { const j = Math.floor(rng() * (k + 1)); [deck[k], deck[j]] = [deck[j], deck[k]]; }
  const islands = pts.map((p, i) => {
    if (i === 0) {
      return { id: 'home', home: true, realm_id: home?.realm_id ?? 'home', name: home?.realm_name ?? 'Home', biome: 'home',
        position: [0, 0, 0], radius: homeRadius, hue: 0.05, species: [] };
    }
    const b = BIOMES[deck[(i - 1) % deck.length]];
    const name = `${pick(rng, SYL_A)}${pick(rng, SYL_B)} ${pick(rng, PLACE)}`;
    const islandSeed = subSeed(seed, `island-${i}`);
    const jitter = () => r2((rng() - 0.5) * 0.2);
    const metaphysics = Object.fromEntries(Object.entries(b.meta).map(([k, v]) => [k, Math.min(1, Math.max(0, v + jitter()))]));
    const manifest = intentToManifest({ name, metaphysics: { entropy: 0.35, luminosity: 0.7, coherence: 0.6, resonance: 0.5, inversion: 0.2, lucidity: 0.55, ...metaphysics },
      time: 1, hue: (b.hue + (rng() - 0.5) * 0.06 + 1) % 1, layers: b.layers, web: null }, islandSeed);
    const id = `isle-${i}`;
    return {
      id, home: false, realm_id: manifest.realm_id, name, biome: b.biome, biome_label: b.label,
      position: [r2(p.x), r2(p.y), r2((rng() - 0.5) * 50)], radius: manifest.bounds.radius, hue: r2(b.hue),
      species: islandSpecies(rng, b, name),
      manifest,
    };
  });
  const bridges = skyBridges(pts, 3, minSpacing * 1.9).map(([a, b]) => ({ a: islands[a].id, b: islands[b].id }));
  return { world_id: `world-${seed.toString(16)}`, seed, name: 'The Lumenne Archipelago', islands, bridges };
}

/** The `world_manifest` payload (the home island carries no manifest: it streams as the live realm). */
export function worldPayload(world) {
  return {
    world_id: world.world_id,
    name: world.name,
    seed: world.seed,
    islands: world.islands.map(({ species, ...i }) => i),
    bridges: world.bridges,
  };
}
