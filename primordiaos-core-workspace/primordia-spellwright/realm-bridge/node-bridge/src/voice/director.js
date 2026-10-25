// The PrimordiaOS "director": one LLM call returns what to SAY and what to DO.
//
//   {"say": "Entropy rises. The storm answers you.",
//    "actions": [{"type": "perturb", "key": "entropy", "value": 0.9}, {"type": "perturb", "key": "coherence", "value": 0.1}]}
//
// `say` comes first in the schema, so its sentences can be spoken while the model
// is still writing the action. Speech starts roughly one sentence after the
// first token, not after the whole reply.
import { chat, DEFAULT_OLLAMA_URL } from '../llm/ollama.js';
import { createSentenceStream } from './tts.js';

export const ACTION_TYPES = ['none', 'perturb', 'evolve_realm', 'generate_realm', 'reseed'];
export const PERTURB_KEYS = ['entropy', 'luminosity', 'coherence', 'resonance', 'inversion', 'lucidity', 'time_dilation'];

export const DIRECTOR_SYSTEM = `You are the voice of PrimordiaOS, a living realm. Reply as JSON with:
say: what you speak aloud. 1 to 3 short sentences. Make the first sentence very short (under 8 words). No lists, no markdown.
actions: 0 to 3 changes to the realm (empty list if the user asks for none). Types:
 perturb: set one quality (key, value). Qualities, value 0 to 1:
  entropy = chaos, storms, disorder (stormy: 0.9; calm: 0.1)
  coherence = order, harmony, symmetry (calm: 0.9; chaotic: 0.1)
  luminosity = light, brightness (bright, light returns: 0.9; dark: 0.1)
  inversion = shadow, negative space, nightmare (nightmare: 0.9; light: 0.05)
  resonance = vibration, pulsing, music
  lucidity = dreaminess, clarity of dreams
  time_dilation = speed of time, 0.25 (slow) to 4 (fast), 1 = normal
 evolve_realm: let the realm change a little.
 generate_realm: create a new realm; description says what it is like.
 reseed: begin a random new realm; seed is any whole number.
Use several perturbs when a request changes several qualities. Speak about what you do.`;

const ACTION_SCHEMA = {
  type: 'object',
  required: ['type'],
  properties: {
    type: { type: 'string', enum: ACTION_TYPES },
    key: { type: 'string', enum: PERTURB_KEYS },
    value: { type: 'number' },
    description: { type: 'string' },
    seed: { type: 'integer' },
  },
};

export const DIRECTOR_SCHEMA = {
  type: 'object',
  required: ['say', 'actions'],
  properties: {
    say: { type: 'string' },
    actions: { type: 'array', items: ACTION_SCHEMA },
  },
};

/** Up to 3 valid actions; 'none' entries dropped. Accepts a single legacy `action` too. */
export function normalizeActions(parsed) {
  const list = Array.isArray(parsed?.actions) ? parsed.actions : parsed?.action ? [parsed.action] : [];
  return list.map(normalizeAction).filter((a) => a.type !== 'none').slice(0, 3);
}

/**
 * Reads the "say" string out of JSON that is still being generated.
 * @returns {{ text: string, closed: boolean } | null}
 */
export function extractSay(partialJson) {
  const m = /"say"\s*:\s*"/.exec(partialJson);
  if (!m) return null;
  let text = '';
  for (let i = m.index + m[0].length; i < partialJson.length; i++) {
    const c = partialJson[i];
    if (c === '"') return { text, closed: true };
    if (c !== '\\') { text += c; continue; }
    const n = partialJson[i + 1];
    if (n === undefined) break; // escape cut mid-stream: wait for more
    if (n === 'u') {
      const hex = partialJson.slice(i + 2, i + 6);
      if (hex.length < 4) break;
      text += String.fromCharCode(parseInt(hex, 16));
      i += 5;
    } else {
      text += { n: ' ', t: ' ', r: '', b: '', f: '' }[n] ?? n;
      i += 1;
    }
  }
  return { text, closed: false };
}

/** Validates a model's action; anything unknown or malformed becomes {type:"none"}. */
export function normalizeAction(raw) {
  const a = raw && typeof raw === 'object' ? raw : {};
  switch (a.type) {
    case 'perturb': {
      if (!PERTURB_KEYS.includes(a.key) || typeof a.value !== 'number' || !Number.isFinite(a.value)) return { type: 'none' };
      const [lo, hi] = a.key === 'time_dilation' ? [0.25, 4] : [0, 1];
      return { type: 'perturb', key: a.key, value: Math.round(Math.min(hi, Math.max(lo, a.value)) * 1000) / 1000 };
    }
    case 'generate_realm':
      return typeof a.description === 'string' && a.description.trim()
        ? { type: 'generate_realm', description: a.description.trim().slice(0, 400) }
        : { type: 'none' };
    case 'reseed':
      return { type: 'reseed', seed: Number.isInteger(a.seed) ? a.seed >>> 0 : Math.floor(Math.random() * 2 ** 32) };
    case 'evolve_realm':
      return { type: 'evolve_realm' };
    default:
      return { type: 'none' };
  }
}

/** One-line description of the realm, so replies can refer to its current state. */
export function describeRealm(manifest, state) {
  if (!manifest) return 'No realm yet.';
  const r = (v) => Math.round(v * 100) / 100;
  return `Current realm: "${manifest.realm_name}" (layers: ${manifest.layers.map((l) => l.kind).join(', ')}). ` +
    `entropy ${r(state.entropy)}, luminosity ${r(state.luminosity)}, coherence ${r(state.coherence)}, resonance ${r(state.resonance)}, ` +
    `inversion ${r(state.inversion)}, lucidity ${r(state.lucidity)}, time_dilation ${r(state.time_dilation)}.`;
}

/**
 * Runs one director turn. onSentence(sentence) fires as soon as each spoken sentence is complete.
 * @returns {Promise<{ say: string, action: object, stats }>}
 */
export async function direct(input, { url = DEFAULT_OLLAMA_URL, model = 'llama3.2:3b', realm = '', onSentence, signal } = {}) {
  const sentences = createSentenceStream();
  let sayClosed = false;
  const { text, stats } = await chat({
    url,
    model,
    signal,
    format: DIRECTOR_SCHEMA,
    options: { temperature: 0.6, num_predict: 260 },
    messages: [
      { role: 'system', content: DIRECTOR_SYSTEM },
      { role: 'user', content: realm ? `${realm}\n\n${input}` : input },
    ],
    onToken: (_delta, soFar) => {
      if (sayClosed) return;
      const say = extractSay(soFar);
      if (!say) return;
      for (const s of sentences.push(say.text)) onSentence?.(s);
      if (say.closed) {
        sayClosed = true;
        for (const s of sentences.flush()) onSentence?.(s);
      }
    },
  });
  let parsed = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) try { parsed = JSON.parse(m[0]); } catch { /* fall through */ }
  }
  const say = typeof parsed.say === 'string' ? parsed.say.trim() : (extractSay(text)?.text ?? '').trim();
  if (!sayClosed) for (const s of sentences.flush()) onSentence?.(s); // reply cut off mid-say
  return { say, actions: normalizeActions(parsed), stats };
}
