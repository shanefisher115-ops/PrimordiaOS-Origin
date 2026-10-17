// PRS-1 autonomous realm authoring (docs/PRS-1.md §5).
// genesis(): seed + metaphysical state -> revision 0 manifest.
// evolve():  previous manifest + state -> next revision (small, bounded deltas).
import { mulberry32, subSeed, clamp01, r4, v3 } from '../prng.js';
import { snapshotMetaphysics } from '../state.js';
import { payloadSchemas, validate } from '../schemas.js';

const PREFIX = ['Aur', 'Vel', 'Nyx', 'Ser', 'Thal', 'Ombr', 'Lum', 'Cael', 'Eld', 'Myr', 'Zeph', 'Ish'];
const SUFFIX = ['ion', 'ara', 'eth', 'oria', 'umbra', 'is', 'ith', 'enne', 'ael'];
const EPITHET = ['Deep', 'Expanse', 'Reach', 'Hollow', 'Spire', 'Veil', 'Crucible', 'Threshold'];
const EXTRA_LAYERS = ['ring', 'lattice', 'void', 'spire_field'];
const TOPOLOGIES = ['small_world', 'scale_free', 'lattice', 'toroidal', 'fractal_tree'];

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// Glyph intents (PRS-1 §3.6): what a glyph is *for*, written as a short statement.
// Consumers inscribe the intent into the glyph's shape, so the words are the design.
// The verb follows the glyph's kind; the object is whichever metaphysic dominated
// the realm when the glyph was born.
const INTENT_VERBS = {
  sigil: ['CALL', 'KINDLE', 'REMEMBER', 'WEAVE', 'NAME', 'AWAKEN'],
  ward: ['GUARD', 'SHIELD', 'HOLD', 'KEEP', 'BIND', 'STILL'],
  gate: ['OPEN', 'CROSS', 'UNSEAL', 'RETURN', 'ASCEND', 'PASS'],
};
const INTENT_OBJECTS = {
  entropy: 'THE STORM',
  coherence: 'THE PATTERN',
  resonance: 'THE CHORUS',
  inversion: 'THE SHADOW',
  lucidity: 'THE DREAM',
  luminosity: 'THE DAWN',
};

function dominantMetaphysic(state) {
  return Object.keys(INTENT_OBJECTS).reduce((best, k) => (state[k] > state[best] ? k : best), 'entropy');
}

// Drawn from its own stream (label `glyph:<id>`) so adding intents never shifts the
// realm stream: existing seeds still produce the same layers, glyphs and topology.
function intentFor(seed, id, kind, state, realmName) {
  const rng = mulberry32(subSeed(seed, `glyph:${id}`));
  const place = realmName.split(' ')[0].toUpperCase();
  return `${pick(rng, INTENT_VERBS[kind])} ${INTENT_OBJECTS[dominantMetaphysic(state)]} OF ${place}`;
}

function layer(rng, kind, order, altitude, radius, density, params = {}) {
  return {
    id: `${kind}-${order}`,
    kind,
    order,
    altitude: r4(altitude),
    radius: r4(radius),
    density: r4(density),
    palette: [
      [r4(0.2 + rng() * 0.8), r4(0.2 + rng() * 0.8), r4(0.2 + rng() * 0.8)],
      [r4(rng() * 0.4), r4(rng() * 0.4), r4(rng() * 0.6)],
    ],
    params,
  };
}

function sigil(rng, index, ringRadius, seed, state, realmName) {
  const a = rng() * Math.PI * 2;
  const id = `sigil-${index}`;
  const kind = pick(rng, ['sigil', 'ward', 'gate']);
  return {
    id,
    kind,
    position: v3(Math.cos(a) * ringRadius, Math.sin(a) * ringRadius, 4 + rng() * 10),
    scale: r4(2 + rng() * 4),
    symmetry: 3 + Math.floor(rng() * 9),
    complexity: r4(rng()),
    hue: r4(rng()),
    intent: intentFor(seed, id, kind, state, realmName),
  };
}

export function genesis(seed, state) {
  seed = seed >>> 0;
  const rng = mulberry32(subSeed(seed, 'realm'));
  const realm_name = `${pick(rng, PREFIX)}${pick(rng, SUFFIX)} ${pick(rng, EPITHET)}`;
  const bounds = 120;

  const layers = [];
  layers.push(rng() < 0.7
    ? layer(rng, 'ground', 0, 0, bounds, 0.4 + rng() * 0.4, { roughness: r4(rng()), terrace_count: 1 + Math.floor(rng() * 5) })
    : layer(rng, 'ocean', 0, 0, bounds, 0.5 + rng() * 0.3, { wave_height: r4(0.2 + rng()), wave_speed: r4(0.2 + rng()) }));
  layers.push(layer(rng, 'sky', 1, 80, bounds * 1.5, 0.3 + rng() * 0.5, { star_count: 200 + Math.floor(rng() * 1800) }));
  // Extra layer kinds are drawn without replacement (deterministic Fisher-Yates).
  const kinds = [...EXTRA_LAYERS];
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  const extras = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < extras; i++) {
    const kind = kinds[i];
    const params =
      kind === 'ring' ? { thickness: r4(1 + rng() * 4), tilt_deg: r4(rng() * 35) }
      : kind === 'lattice' ? { cell_size: r4(6 + rng() * 10) }
      : kind === 'spire_field' ? { max_height: r4(10 + rng() * 40) }
      : { aperture: r4(0.2 + rng() * 0.6) };
    layers.push(layer(rng, kind, 2 + i, 5 + rng() * 50, 20 + rng() * 80, rng(), params));
  }

  const glyphs = [{
    id: 'soul',
    kind: 'soul',
    position: v3(0, 0, 14),
    scale: 6,
    symmetry: 6,
    complexity: 0.5,
    hue: 0.62,
    bound_to: 'soul',
    // The soul's intent is the realm's own name: it wears it as a crown.
    intent: realm_name.toUpperCase(),
  }];
  const sigils = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < sigils; i++) glyphs.push(sigil(rng, i, 32, seed, state, realm_name));

  return {
    prs: '1.0',
    realm_id: `realm-${seed.toString(16).padStart(8, '0')}`,
    realm_name,
    seed,
    revision: 0,
    transition_seconds: 4,
    generated_by: { module: 'Worldforge', at: new Date().toISOString() },
    units: { length: 'meter', up: '+Z', handedness: 'left' },
    bounds: { radius: bounds },
    layers,
    metaphysics: snapshotMetaphysics(state),
    topology: {
      kind: pick(rng, TOPOLOGIES),
      node_count: 32 + Math.floor(rng() * 64),
      edge_density: r4(0.2 + rng() * 0.6),
      radius: 18,
      center: [0, 0, 22],
    },
    glyphs,
  };
}

// One evolution step. `rng` is the Worldforge evolution stream (seeded), so a
// realm's whole history is reproducible from (seed, state trajectory).
export function evolve(prev, state, rng) {
  const next = structuredClone(prev);
  next.revision = prev.revision + 1;
  next.generated_by = { module: 'Worldforge', at: new Date().toISOString() };
  next.metaphysics = snapshotMetaphysics(state);

  // PRS-1 §6.2 bounded deltas: density moves at most ±0.05 per revision.
  for (const l of next.layers) l.density = r4(clamp01(l.density + (rng() - 0.5) * 0.1));

  // Entropy may birth or dissolve a sigil (never the soul glyph).
  if (rng() < state.entropy * 0.4) {
    const sigils = next.glyphs.filter((g) => g.kind !== 'soul');
    if (sigils.length > 1 && rng() < 0.5) {
      const victim = sigils[Math.floor(rng() * sigils.length)];
      next.glyphs = next.glyphs.filter((g) => g !== victim);
    } else if (sigils.length < 8) {
      const maxIndex = Math.max(-1, ...sigils.map((g) => Number(g.id.split('-')[1]) || 0));
      next.glyphs.push(sigil(rng, maxIndex + 1, 32, next.seed, state, next.realm_name));
    }
  }

  // Rare structural mutation: the web reorganizes.
  if (rng() < 0.08) {
    next.topology.kind = pick(rng, TOPOLOGIES);
    next.topology.node_count = Math.max(16, Math.min(128, next.topology.node_count + Math.round((rng() - 0.5) * 24)));
  }

  const soul = next.glyphs.find((g) => g.kind === 'soul');
  if (soul) {
    soul.symmetry = 3 + Math.floor(state.coherence * 9);
    soul.complexity = r4(state.lucidity);
  }
  return next;
}

export function validateManifest(manifest) {
  return validate(manifest, payloadSchemas.realm_manifest, '$');
}
