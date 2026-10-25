// Description semantics: what the words of a realm description mean, read deterministically.
//
// The model writes a compact intent (design.js), which is fast but coarse: it picks layer
// kinds and metaphysics, but it cannot say "stone circles" or "a broken ring", and a small
// model sometimes ignores "no ocean" or makes a "calm" realm stormy. This module reads the
// description itself (no extra tokens, microseconds) and refines the intent:
//   - layer words make sure a kind is present; negated ones ("no ocean", "without stars") remove it,
//   - feature words set composition and layer params (PRS-1 §3.3),
//   - mood words pull a metaphysic into a range ("calm" caps entropy, "nightmare" raises inversion),
//     so they agree with the model instead of adding to it,
//   - colour words set the hue, structure words the web topology, tempo words the time flow,
//   - quantity words ("countless", "a few") scale the counts of the feature they precede.
// Every match is reported, so a UI can show what was understood.

export const LAYER_ORDER = ['ground', 'ocean', 'spire_field', 'lattice', 'void', 'ring', 'sky'];

// Valid ranges for every param a reading may set (mirror of the repair whitelist).
const RANGES = {
  roughness: [0, 1], terrace_count: [1, 12, true], wave_height: [0, 10], star_count: [0, 5000, true],
  thickness: [0.1, 50], aperture: [0, 1], max_height: [1, 200],
  monolith_clusters: [0, 24, true], cluster_spread: [1, 40], rubble: [0, 1], islet_count: [0, 32, true],
  band_strength: [0, 1], keystones: [0, 24, true], gap_count: [0, 6, true], arc: [0.05, 1],
  struts: [0, 1], spire_clusters: [1, 16, true], falloff: [0.25, 4], debris: [0, 1],
};
// Params that are counts: quantity words scale these.
const COUNTS = new Set(['monolith_clusters', 'islet_count', 'star_count', 'keystones', 'spire_clusters', 'terrace_count']);

// [pattern, meaning]. Patterns are matched on lower-case text at word boundaries.
// meaning: { layer, params: { key: value } (for that layer), meta: { key: [min, max] } }
const FEATURES = [
  // ground
  ['stone circles?|standing stones|henges?|menhirs?|monoliths?|megaliths?|dolmens?|cromlechs?', { layer: 'ground', params: { monolith_clusters: 10 }, meta: { coherence: [0.55, 1] } }],
  ['temples?|sanctuar(?:y|ies)|shrines?|altars?', { layer: 'ground', params: { monolith_clusters: 4, cluster_spread: 14 }, meta: { coherence: [0.6, 1] } }],
  ['ruins?|ruined|rubble|crumbling|shattered stone|broken stone', { layer: 'ground', params: { rubble: 0.95, roughness: 0.7 }, meta: { entropy: [0.45, 1] } }],
  ['terraces?|steps|stairs|tiers?|ziggurats?', { layer: 'ground', params: { terrace_count: 8 } }],
  ['plateaus?|mesas?|tablelands?', { layer: 'ground', params: { terrace_count: 3, roughness: 0.3 } }],
  ['mountains?|cliffs?|crags?|canyons?|jagged land|rugged', { layer: 'ground', params: { terrace_count: 10, roughness: 0.9 } }],
  ['plains?|meadows?|fields|steppes?|land|ground|earth|desert|dunes?', { layer: 'ground' }],
  // ocean
  ['archipelago|islands|isles|atolls?', { layer: 'ocean', params: { islet_count: 18 } }],
  ['island|isle|sea stacks?|reefs?', { layer: 'ocean', params: { islet_count: 6 } }],
  ['storm(?:y)? seas?|raging seas?|rough seas?|crashing waves|towering waves', { layer: 'ocean', params: { wave_height: 4 }, meta: { entropy: [0.6, 1] } }],
  ['glass seas?|mirror seas?|still waters?|calm seas?|silent seas?', { layer: 'ocean', params: { wave_height: 0.15 }, meta: { entropy: [0, 0.3] } }],
  ['oceans?|seas?|waters?|lakes?|tides?|waves|bay|lagoon', { layer: 'ocean' }],
  // sky
  ['milky way|galax(?:y|ies)|galactic|river of stars|star river', { layer: 'sky', params: { band_strength: 0.9, star_count: 3500 } }],
  ['starless|no stars|empty sky', { avoid: 'sky' }],
  ['constellations?|starry|starlit|stars|starfield|heavens|cosmos|firmament|night sky|sky', { layer: 'sky' }],
  // ring
  ['broken rings?|shattered rings?|half(?:-| )rings?|broken halo|severed ring', { layer: 'ring', params: { arc: 0.55, gap_count: 4 } }],
  ['asteroid belts?|asteroids|debris belt', { layer: 'ring', params: { keystones: 2, gap_count: 1, thickness: 12 } }],
  ['orbiting (?:pillars|stones|monoliths)|keystones?|gates? in orbit', { layer: 'ring', params: { keystones: 12 } }],
  ['rings?|halos?|orbits?|belt', { layer: 'ring' }],
  // lattice
  ['crystal lattice|scaffold(?:ing)?|webs? of light|lattice of light|cathedral of glass', { layer: 'lattice', params: { struts: 0.9 }, meta: { coherence: [0.6, 1] } }],
  ['shattered crystal|broken lattice|fractured crystal', { layer: 'lattice', params: { struts: 0.25 }, meta: { entropy: [0.5, 1] } }],
  ['lattices?|crystals?|crystalline|grids?|matrix|geometry|geometric', { layer: 'lattice' }],
  // void
  ['black holes?|singularity|accretion|event horizon', { layer: 'void', params: { debris: 0.95, aperture: 0.6 }, meta: { inversion: [0.4, 1] } }],
  ['abyss(?:es)?|chasms?|maw', { layer: 'void', params: { aperture: 0.85 }, meta: { inversion: [0.35, 1] } }],
  ['voids?|hollows?|emptiness|nothingness|vacuum', { layer: 'void' }],
  // spire_field
  ['cit(?:y|ies)|citadels?|metropolis|skyline', { layer: 'spire_field', params: { spire_clusters: 8, falloff: 2.5 }, meta: { coherence: [0.5, 1] } }],
  ['thorns?|spikes?|jagged spires?|teeth', { layer: 'spire_field', params: { falloff: 0.7 }, meta: { entropy: [0.5, 1] } }],
  ['cathedrals?|crowns?|peaks?|pinnacles?', { layer: 'spire_field', params: { falloff: 3 } }],
  ['forests? of (?:stone|crystal|glass)|stone forests?', { layer: 'spire_field', params: { spire_clusters: 12 } }],
  ['spires?|towers?|needles?|obelisks?|minarets?|columns?|pillars?', { layer: 'spire_field' }],
];

// Mood words pull a metaphysic into a range.
const MOODS = [
  ['calm|serene|peaceful|tranquil|quiet|gentle|still', { entropy: [0, 0.3], coherence: [0.55, 1] }],
  ['storm(?:s|y)?|tempests?|chao(?:s|tic)|turbulent|wild|raging|violent|maelstrom', { entropy: [0.7, 1], coherence: [0, 0.45] }],
  ['ordered|symmetric(?:al)?|perfect|harmon(?:y|ious)|balanced|precise', { coherence: [0.75, 1] }],
  ['bright|radiant|luminous|golden|sunlit|dawn|daylight|shining|blazing', { luminosity: [0.7, 1] }],
  ['dark|gloom(?:y)?|dim|midnight|night|shadowy|murky|black', { luminosity: [0, 0.35] }],
  ['nightmares?|dread|haunted|corrupt(?:ed)?|cursed|inverted|sinister|shadow realm|hell', { inversion: [0.65, 1], luminosity: [0, 0.4] }],
  ['dreams?|dreamy|dreaming|lucid|reverie|ethereal|surreal|visions?', { lucidity: [0.7, 1] }],
  ['singing|chiming|bells?|humming|resonant|music(?:al)?|choirs?|songs?|thrumming', { resonance: [0.7, 1] }],
];
const TEMPOS = [
  ['frozen|timeless|eternal|slow|still time|lingering', 0.4],
  ['rushing|fleeting|racing|accelerat(?:ed|ing)|fast|hurried', 2.2],
];
const HUES = [
  ['crimson|scarlet|blood|red|ruby', 0.0], ['ember|orange|amber|copper|rust', 0.07], ['gold(?:en)?|yellow|saffron|honey', 0.13],
  ['emerald|green|jade|verdant|moss', 0.33], ['teal|cyan|turquoise|aqua', 0.5], ['azure|blue|sapphire|cobalt', 0.6],
  ['indigo', 0.68], ['violet|purple|amethyst|lilac', 0.78], ['pink|rose|magenta|fuchsia', 0.9],
];
const WEBS = [
  ['branch(?:ing|es)|roots?|tree of|fractal', 'fractal_tree'], ['torus|toroid(?:al)?|donut|loops?|cycles?|wheel', 'toroidal'],
  ['hubs?|nexus|empires?|kingdoms?', 'scale_free'], ['grid|lattice web|mesh network', 'lattice'], ['small world|villages?|community', 'small_world'],
];

const NEGATION = /\b(?:no|without|not|never|lacking|free of|devoid of|absent)\s+(?:\w+\s+){0,2}$/;
const MORE = /\b(?:many|countless|endless|thousands of|hundreds of|dense|teeming|crowded|innumerable|vast)\s+(?:\w+\s+){0,1}$/;
const FEWER = /\b(?:a few|few|sparse|scattered|lonely|lone|single|one|solitary|a handful of)\s+(?:\w+\s+){0,1}$/;

const clampParam = (key, v) => {
  const [lo, hi, int] = RANGES[key];
  const c = Math.min(hi, Math.max(lo, v));
  return int ? Math.round(c) : Math.round(c * 10000) / 10000;
};

/** Every non-overlapping match of `alternatives`, with the text before it (for negation and quantity). */
function* matches(text, alternatives, taken) {
  const re = new RegExp(`\\b(?:${alternatives})\\b`, 'g');
  for (let m; (m = re.exec(text)); ) {
    const span = [m.index, m.index + m[0].length];
    if (taken.some(([a, b]) => span[0] < b && span[1] > a)) continue;
    taken.push(span);
    yield { phrase: m[0], before: text.slice(Math.max(0, m.index - 40), m.index) };
  }
}

/**
 * Reads a description.
 * @returns {{ want: string[], avoid: string[], params: Record<string, Record<string, number>>,
 *             meta: Record<string, [number, number]>, hue: number|null, web: string|null, time: number|null,
 *             understood: string[] }}
 */
export function readDescription(description) {
  const text = ` ${String(description ?? '').toLowerCase().replace(/[^a-z0-9' -]+/g, ' ')} `;
  const out = { want: [], avoid: [], params: {}, meta: {}, hue: null, web: null, time: null, understood: [] };
  const taken = []; // longer, more specific phrases are listed first and claim their words
  const narrow = (key, [lo, hi]) => {
    const [a, b] = out.meta[key] ?? [0, 1];
    out.meta[key] = [Math.max(a, lo), Math.min(b, hi)];
    if (out.meta[key][0] > out.meta[key][1]) out.meta[key] = [lo, hi]; // contradiction: the later word wins
  };

  for (const [alternatives, meaning] of FEATURES) {
    for (const { phrase, before } of matches(text, alternatives, taken)) {
      const negated = NEGATION.test(before);
      const kind = meaning.layer ?? meaning.avoid;
      if (negated || meaning.avoid) {
        if (!out.avoid.includes(kind)) out.avoid.push(kind);
        out.understood.push(`"${phrase}" -> no ${kind}`);
        continue;
      }
      if (!out.want.includes(kind)) out.want.push(kind);
      const scale = MORE.test(before) ? 1.8 : FEWER.test(before) ? 0.4 : 1;
      const set = {};
      for (const [key, value] of Object.entries(meaning.params ?? {})) {
        set[key] = clampParam(key, COUNTS.has(key) ? value * scale : value);
      }
      if (scale !== 1 && !Object.keys(set).some((k) => COUNTS.has(k))) {
        // "countless spires" with no count param of its own: scale the layer's main count.
        const main = { ground: 'monolith_clusters', ocean: 'islet_count', sky: 'star_count', ring: 'keystones', spire_field: 'spire_clusters' }[kind];
        const base = { monolith_clusters: 6, islet_count: 6, star_count: 1500, keystones: 6, spire_clusters: 4 }[main];
        if (main) set[main] = clampParam(main, base * scale);
      }
      out.params[kind] = { ...out.params[kind], ...set };
      for (const [key, range] of Object.entries(meaning.meta ?? {})) narrow(key, range);
      const details = Object.entries(set).map(([k, v]) => `${k}=${v}`).join(', ');
      out.understood.push(`"${phrase}" -> ${kind}${details ? ` (${details})` : ''}`);
    }
  }
  for (const [alternatives, ranges] of MOODS) {
    for (const { phrase, before } of matches(text, alternatives, taken)) {
      if (NEGATION.test(before)) continue; // "not calm" says little; leave it to the model
      for (const [key, range] of Object.entries(ranges)) narrow(key, range);
      out.understood.push(`"${phrase}" -> ${Object.entries(ranges).map(([k, [a, b]]) => `${k} ${a}-${b}`).join(', ')}`);
    }
  }
  for (const [alternatives, time] of TEMPOS) {
    for (const { phrase } of matches(text, alternatives, taken)) {
      out.time ??= time;
      out.understood.push(`"${phrase}" -> time ${time}`);
    }
  }
  for (const [alternatives, hue] of HUES) {
    for (const { phrase } of matches(text, alternatives, taken)) {
      if (out.hue === null) out.understood.push(`"${phrase}" -> hue ${hue}`);
      out.hue ??= hue;
    }
  }
  for (const [alternatives, web] of WEBS) {
    for (const { phrase } of matches(text, alternatives, taken)) {
      if (out.web === null) out.understood.push(`"${phrase}" -> web ${web}`);
      out.web ??= web;
    }
  }
  out.want = out.want.filter((k) => !out.avoid.includes(k));
  return out;
}

/**
 * Refines a normalized intent (design.js) with a reading. Pure: returns a new intent.
 * Layers keep the model's order; wanted kinds are inserted at their natural height and
 * avoided ones removed (at least one layer always remains). Metaphysics are clamped into
 * the reading's ranges. Hue, web and time follow explicit words.
 */
export function applySemantics(intent, reading) {
  let layers = intent.layers.filter((k) => !reading.avoid.includes(k));
  for (const kind of reading.want) {
    if (layers.includes(kind)) continue;
    const rank = LAYER_ORDER.indexOf(kind);
    const at = layers.findIndex((k) => LAYER_ORDER.indexOf(k) > rank);
    layers.splice(at < 0 ? layers.length : at, 0, kind);
  }
  // A ground or an ocean is the floor; "no ocean" alone should not leave a realm floating.
  if (!layers.some((k) => k === 'ground' || k === 'ocean') && !reading.want.includes('void')) {
    const floor = reading.avoid.includes('ground') ? 'ocean' : 'ground';
    if (!reading.avoid.includes(floor)) layers.unshift(floor);
  }
  if (!layers.length) layers = ['ground'];
  layers = layers.slice(0, 6);

  const metaphysics = { ...intent.metaphysics };
  for (const [key, [lo, hi]] of Object.entries(reading.meta)) {
    if (key in metaphysics) metaphysics[key] = Math.round(Math.min(hi, Math.max(lo, metaphysics[key])) * 10000) / 10000;
  }
  const params = {};
  for (const kind of layers) if (reading.params[kind]) params[kind] = { ...reading.params[kind] };
  return {
    ...intent,
    layers,
    metaphysics,
    hue: reading.hue ?? intent.hue,
    web: reading.web ?? intent.web,
    time: reading.time ?? intent.time,
    params,
    understood: reading.understood,
  };
}
