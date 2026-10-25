// Incarnation: how the Sovereign's species appear in the realm (docs/SOVEREIGN.md).
//
// Each living species becomes one streamed entity, `species:<slug>`, whose payload says
// everything a renderer needs to draw it: how it behaves (its manifestation), how many
// bodies to draw, where its home is and how far it roams, its colour, size and speed.
// The decisions live here, in one deterministic place: the same species in the same realm
// always looks and lives the same way, and Unreal only animates what it is told.

/** Archetype -> manifestation (behaviour) and body. Sizes in metres, speeds in m/s. */
export const ARCHETYPE_FORMS = {
  Photosynthetic: { manifestation: 'rooted', hue: 0.24, sat: 0.75, size: 1.4, speed: 0, glow: 1.6, cap: 60 },
  Fungal: { manifestation: 'rooted', hue: 0.42, sat: 0.7, size: 1.0, speed: 0, glow: 2.2, cap: 60 },
  Predatory: { manifestation: 'individual', hue: 0.99, sat: 0.85, size: 2.2, speed: 3.5, glow: 1.1, cap: 24 },
  Synthetic: { manifestation: 'individual', hue: 0.58, sat: 0.35, size: 1.6, speed: 1.4, glow: 1.4, cap: 32 },
  Collective: { manifestation: 'swarm', hue: 0.53, sat: 0.8, size: 0.35, speed: 5, glow: 2.4, cap: 400 },
  Elemental: { manifestation: 'floating', hue: 0.07, sat: 0.85, size: 2.8, speed: 0.6, glow: 2.6, cap: 24 },
  Spectral: { manifestation: 'floating', hue: 0.76, sat: 0.4, size: 1.8, speed: 0.5, glow: 2.0, cap: 30 },
  Abyssal: { manifestation: 'abyssal', hue: 0.62, sat: 0.7, size: 9, speed: 1.2, glow: 1.3, cap: 10 },
};
/** How far each manifestation roams, as a fraction of the ground's radius. */
const RANGE = { rooted: 0.07, individual: 0.22, swarm: 0.3, floating: 0.25, abyssal: 0.45 };
/** A population this large draws the manifestation's full cap; smaller ones draw fewer bodies. */
const FULL_POPULATION = 5000;

export const slug = (name) => String(name).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unnamed';

/** FNV-1a: a stable 0..1 value per (name, salt). */
function hash01(text, salt = '') {
  let h = 0x811c9dc5;
  for (const c of `${salt}:${text}`) {
    h ^= c.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h / 0xffffffff;
}

function hsvToLinear(h, s, v) {
  const i = Math.floor(h * 6) % 6;
  const f = h * 6 - Math.floor(h * 6);
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  const [r, g, b] = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i];
  const lin = (c) => Math.round(Math.pow(c, 2.2) * 1000) / 1000; // sRGB-ish -> linear
  return [lin(r), lin(g), lin(b)];
}

/**
 * Bodies drawn for a population: logarithmic, so 13 and 1800 both read, capped per
 * manifestation, never more than the population itself.
 */
export function bodiesFor(population, cap) {
  if (!(population > 0)) return 0;
  const n = Math.round((cap * Math.log10(1 + population)) / Math.log10(1 + FULL_POPULATION));
  return Math.max(1, Math.min(population, cap, n));
}

/** The ground a species lives on: the realm's ground layer (radius and altitude, metres). */
export function groundOf(manifest) {
  const g = manifest?.layers?.find((l) => l.kind === 'ground');
  return { radius: g?.radius ?? 100, altitude: g?.altitude ?? 0 };
}

/** One species -> its `species` packet payload. */
export function incarnate(species, manifest, cycle = 0) {
  const form = ARCHETYPE_FORMS[species.archetype] ?? ARCHETYPE_FORMS.Elemental;
  const { radius: R, altitude } = groundOf(manifest);
  const a = hash01(species.name, 'angle') * 2 * Math.PI;
  const r = form.manifestation === 'abyssal' ? R * (0.8 + 0.5 * hash01(species.name, 'r')) : R * (0.3 + 0.42 * hash01(species.name, 'r'));
  const z = form.manifestation === 'abyssal' ? altitude - 48 : altitude;
  const hue = (form.hue + (hash01(species.name, 'hue') - 0.5) * 0.12 + 1) % 1;
  const sizeJitter = 0.8 + 0.4 * hash01(species.name, 'size');
  const round = (v) => Math.round(v * 100) / 100;
  return {
    name: species.name,
    archetype: species.archetype,
    manifestation: form.manifestation,
    population: species.population,
    bodies: bodiesFor(species.population, form.cap),
    position: [round(r * Math.cos(a)), round(r * Math.sin(a)), round(z)],
    range: round(R * RANGE[form.manifestation]),
    color: hsvToLinear(hue, form.sat, 1),
    glow: form.glow,
    size: round(form.size * sizeJitter),
    speed: form.speed,
    seed: Math.floor(hash01(species.name, 'seed') * 0x7fffffff),
    traits: species.traits ?? [],
    look: species.look ?? '',
    born_cycle: species.born_cycle ?? cycle,
    cycle,
  };
}

/**
 * Keeps track of which species entities exist, so the ones that died get one retire packet.
 * packets(chronicle, manifest) -> PRS-1 packets for this sample (upserts, then retires).
 */
export function createIncarnations() {
  let live = new Set();
  return {
    packets(chronicle, manifest) {
      const out = [];
      const now = new Set();
      for (const s of chronicle.species) {
        if (!(s.population > 0)) continue;
        const id = `species:${slug(s.name)}`;
        if (now.has(id)) continue;
        now.add(id);
        out.push({ type: 'species', id, payload: incarnate(s, manifest, chronicle.cycle) });
      }
      for (const id of live) {
        if (!now.has(id)) out.push({ type: 'species', op: 'retire', id, payload: {} });
      }
      live = now;
      return out;
    },
    /** Retire everything (the Sovereign went to rest). */
    retireAll() {
      const out = [...live].map((id) => ({ type: 'species', op: 'retire', id, payload: {} }));
      live = new Set();
      return out;
    },
  };
}
