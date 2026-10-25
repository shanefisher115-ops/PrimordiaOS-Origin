// LLM realm design by *intent* (docs/OLLAMA.md, "Compact intents").
//
// The model writes only the abstract decisions, a flat ~60-token JSON object:
// a name, the metaphysics, which layer kinds and which web topology.
// Worldforge's genesis() expands that into the full PRS-1 manifest (palettes,
// positions, params, glyphs...) deterministically, in milliseconds, and always
// valid. Generation time is dominated by output tokens, so this is ~10x faster
// than having the model write the manifest itself.
import { chat, DEFAULT_OLLAMA_URL } from '../llm/ollama.js';
import { hashString, hsvToRgb, r4 } from '../prng.js';
import { createMetaState } from '../state.js';
import { genesis, validateManifest } from './prs1.js';
import { applySemantics, readDescription } from './semantics.js';

export const LAYER_KINDS = ['ground', 'ocean', 'sky', 'ring', 'lattice', 'void', 'spire_field'];
export const TOPOLOGY_KINDS = ['small_world', 'scale_free', 'lattice', 'toroidal', 'fractal_tree'];
const META_KEYS = ['entropy', 'luminosity', 'coherence', 'resonance', 'inversion', 'lucidity'];

// Kept short and placed first in every request: Ollama reuses its prompt cache
// for an identical prefix, so after the first call only the description is new.
export const INTENT_SYSTEM = `You are Worldforge. Turn the user's description of a realm into its essential design, as JSON.
name: an evocative 2-3 word realm name.
entropy (disorder), luminosity (light), coherence (order, symmetry), resonance (vibration), inversion (shadow, negative space), lucidity (dream clarity): each 0 to 1.
time: time flow, 0.25 (slow) to 4 (fast), 1 = normal.
hue: the realm's signature colour, 0 to 1 (0 red, 0.33 green, 0.66 blue).
layers: 2-5 strata from bottom to top, each one of: ground, ocean, sky, ring, lattice, void, spire_field. Usually start with ground or ocean and include sky.
web: the realm's network shape: small_world, scale_free, lattice, toroidal or fractal_tree.
Let every value follow the description.`;

export const INTENT_SCHEMA = {
  type: 'object',
  required: ['name', ...META_KEYS, 'time', 'hue', 'layers', 'web'],
  properties: {
    name: { type: 'string' },
    ...Object.fromEntries(META_KEYS.map((k) => [k, { type: 'number' }])),
    time: { type: 'number' },
    hue: { type: 'number' },
    layers: { type: 'array', items: { type: 'string', enum: LAYER_KINDS } },
    web: { type: 'string', enum: TOPOLOGY_KINDS },
  },
};

const clamp = (v, lo, hi, def) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def);

/** Sanitizes a model's intent: clamps numbers, drops unknown kinds, fills defaults. */
export function normalizeIntent(raw) {
  const defaults = createMetaState();
  const intent = raw && typeof raw === 'object' ? raw : {};
  const name = typeof intent.name === 'string' && intent.name.trim() ? intent.name.trim().slice(0, 48) : null;
  const metaphysics = Object.fromEntries(META_KEYS.map((k) => [k, r4(clamp(intent[k], 0, 1, defaults[k]))]));
  const layers = (Array.isArray(intent.layers) ? intent.layers : []).filter((k) => LAYER_KINDS.includes(k)).slice(0, 6);
  return {
    name,
    metaphysics,
    time: r4(clamp(intent.time, 0.25, 4, 1)),
    hue: r4(clamp(intent.hue, 0, 1, 0.05)),
    layers: layers.length ? layers : ['ground', 'sky'],
    web: TOPOLOGY_KINDS.includes(intent.web) ? intent.web : null,
  };
}

/** Expands a (normalized) intent into a full, validated PRS-1 manifest. */
export function intentToManifest(intent, seed) {
  const state = createMetaState();
  Object.assign(state, intent.metaphysics);
  state.time_dilation = intent.time;
  state.essence = hsvToRgb(intent.hue, 0.7, 1.0);
  const manifest = genesis(seed ?? hashString(intent.name ?? JSON.stringify(intent)), state, {
    name: intent.name,
    layers: intent.layers,
    topology: intent.web,
    params: intent.params, // from the description's words (semantics.js), per layer kind
  });
  const errors = validateManifest(manifest);
  if (errors.length) throw new Error(`designed manifest invalid: ${errors.slice(0, 3).join('; ')}`);
  return manifest;
}

/**
 * Description -> manifest via the model.
 * @returns {Promise<{ manifest, intent, raw: string, stats }>}
 */
export async function designRealm(description, { url = DEFAULT_OLLAMA_URL, model = 'llama3.2:3b', seed, onToken, signal } = {}) {
  const { text, stats } = await chat({
    url,
    model,
    signal,
    onToken,
    format: INTENT_SCHEMA,
    // ~60 tokens of JSON; the cap only stops a runaway model.
    options: { temperature: 0.7, num_predict: 200 },
    messages: [
      { role: 'system', content: INTENT_SYSTEM },
      { role: 'user', content: description },
    ],
  });
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error(`${model} did not return JSON`);
    parsed = JSON.parse(m[0]);
  }
  // The model's intent is coarse; the description's own words refine it (semantics.js).
  const intent = applySemantics(normalizeIntent(parsed), readDescription(description));
  return { manifest: intentToManifest(intent, seed), intent, raw: text, stats };
}
