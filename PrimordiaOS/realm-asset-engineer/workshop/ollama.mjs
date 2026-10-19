// Local Ollama, used two optional ways. Neither designs geometry: the agent stays deterministic and the
// kernel builds; these only turn words or pictures into small, clamped numbers.
//   steerBrief  a brief's free-text notes -> generator weights + three coarse biases (height, width, ornament),
//               like realm-bridge's intent design (docs/OLLAMA.md): ~40 output tokens, schema-constrained.
//               A deterministic keyword reader runs first and works with no model at all.
//   visionScore a WebGL thumbnail -> silhouette / detail / genre-fit scores (a vision model such as gemma4).

const AXES = ['height', 'width', 'ornament'];
const WORDS = [
  [/\b(tall|towering|soaring|lofty|high)\b/, { height: 0.7 }],
  [/\b(short|squat|stubby|low|stocky)\b/, { height: -0.7 }],
  [/\b(slender|thin|needle|narrow|delicate)\b/, { width: -0.6 }],
  [/\b(wide|broad|massive|chunky|heavy|fat)\b/, { width: 0.6 }],
  [/\b(ornate|rich|elaborate|busy|decorated|crocketed)\b/, { ornament: 0.7 }],
  [/\b(plain|simple|austere|minimal|bare|clean)\b/, { ornament: -0.7 }],
];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Deterministic reader: generator names/titles mentioned in the notes, plus mood words. */
export function readNotes(notes, style) {
  const text = ` ${String(notes ?? '').toLowerCase()} `;
  const bias = {}, weights = {}, understood = [];
  for (const [re, b] of WORDS) {
    const m = text.match(re);
    if (m) { for (const [k, v] of Object.entries(b)) bias[k] = v; understood.push(m[1]); }
  }
  const negated = (word) => new RegExp(`\\b(no|without|not)\\s+${word}`).test(text);
  for (const [kind, g] of Object.entries(style.generators)) {
    const names = [kind, (g.title ?? '').toLowerCase()].filter(Boolean);
    for (const n of names) {
      const word = n.replace(/[^a-z]/g, '');
      if (!word) continue;
      if (new RegExp(`\\b${word}(e?s)?\\b`).test(text)) {
        weights[kind] = negated(word) ? 0.05 : 4;
        understood.push(`${negated(word) ? 'no ' : ''}${kind}`);
        break;
      }
    }
  }
  return { bias, weights, understood };
}

async function ollamaGenerate(url, body, timeoutMs) {
  const res = await fetch(`${url.replace(/\/+$/, '')}/api/generate`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ stream: false, keep_alive: '10m', ...body }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`ollama HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const out = await res.json();
  return { json: JSON.parse(out.response), tokens: out.eval_count ?? null, seconds: (out.total_duration ?? 0) / 1e9 };
}

/** Notes -> { weights, bias, understood, model? }. Never throws; falls back to the keyword reader. */
export async function steerBrief({ notes, genre, style, config, log = () => {} }) {
  const words = readNotes(notes, style);
  const steer = { weights: { ...words.weights }, bias: { ...words.bias }, understood: words.understood };
  const model = config.steer?.enabled ? config.steer.model : null;
  if (!notes || !model || (model.endsWith(':cloud') && !config.vision?.allowCloud)) return steer;
  const kinds = Object.keys(style.generators);
  const schema = {
    type: 'object',
    properties: {
      generators: { type: 'array', items: { type: 'string', enum: kinds } },
      height: { type: 'number' }, width: { type: 'number' }, ornament: { type: 'number' },
    },
    required: ['generators', 'height', 'width', 'ornament'],
  };
  const prompt = `You steer a generator of ${genre} architecture pieces for a game realm. Pieces: ${kinds.join(', ')}.\n`
    + `Request: "${String(notes).slice(0, 400)}"\n`
    + 'Reply with the pieces the request asks for (empty list = any), and height, width, ornament each from -1 (less) to 1 (more), 0 if not mentioned. One decimal.';
  try {
    const { json, tokens, seconds } = await ollamaGenerate(config.ollamaUrl, { model, prompt, format: schema, options: { temperature: 0, num_predict: 80 } }, config.steer.timeoutSeconds * 1000);
    for (const k of (json.generators ?? []).filter((k) => kinds.includes(k))) steer.weights[k] = Math.max(steer.weights[k] ?? 0, 3);
    for (const a of AXES) {
      if (typeof json[a] !== 'number' || a in words.bias) continue; // the keyword reader wins where it matched
      steer.bias[a] = Math.round(clamp(json[a], -1, 1) * 10) / 10;
    }
    steer.model = model;
    log(`steer: ${model} ${tokens ?? '?'} tokens in ${seconds.toFixed(1)} s -> ${JSON.stringify({ weights: steer.weights, bias: steer.bias })}`);
  } catch (e) {
    log(`steer: ${model} unavailable (${e.message}); keyword reader only`);
  }
  return steer;
}

/** Thumbnail (JPEG bytes) -> { score 0..1, silhouette, detail, fit, model, seconds } or null. */
export async function visionScore({ jpeg, genre, generator, config, log = () => {} }) {
  const model = config.vision?.model;
  if (!model) return null;
  if (model.endsWith(':cloud') && !config.vision.allowCloud) return null;
  const schema = {
    type: 'object',
    properties: { silhouette: { type: 'integer' }, detail: { type: 'integer' }, fit: { type: 'integer' } },
    required: ['silhouette', 'detail', 'fit'],
  };
  const prompt = `This is a render of a generated 3D ${generator} for a ${genre} game realm. Score it from 1 to 10 for: `
    + 'silhouette (a strong, readable outline), detail (convincing, well-proportioned detail), fit (looks like it belongs in that genre). Reply as JSON.';
  try {
    const { json, seconds } = await ollamaGenerate(config.ollamaUrl, {
      model, prompt, images: [Buffer.from(jpeg).toString('base64')], format: schema, think: false, options: { temperature: 0, num_predict: 60 },
    }, config.vision.timeoutSeconds * 1000);
    const s = (k) => clamp(Math.round(Number(json[k]) || 0), 1, 10);
    const score = Math.round(((s('silhouette') + s('detail') + s('fit')) / 30) * 1000) / 1000;
    return { score, silhouette: s('silhouette'), detail: s('detail'), fit: s('fit'), model, seconds: Math.round(seconds) };
  } catch (e) {
    log(`vision: ${model} failed (${e.message})`);
    return null;
  }
}
