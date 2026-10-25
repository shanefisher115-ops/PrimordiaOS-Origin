// Primordia Sovereign: the realm's world-mind (docs/SOVEREIGN.md).
//
// Every cycle one LLM call writes the next turn of the world: a spoken narration (first in
// the schema, so Kokoro starts speaking while the model is still writing), metaphysics it
// pushes, whether the realm evolves, species and their populations, one realm event, one
// lore entry and conceptual Fab asset references. The bridge applies the changes to the live
// realm, keeps a chronicle on disk and broadcasts the cycle as a `sovereign_cycle` packet.
//
// The output is kept to ~250 tokens: the small local models run at 3-7 tokens/s here, and
// a full "species + evolution + ecology + biomes + lore + fab_assets" document would take
// minutes per cycle. The chronicle carries the rest (populations, history) between cycles.
import fs from 'node:fs';
import path from 'node:path';
import { chat as ollamaChat, DEFAULT_OLLAMA_URL } from '../llm/ollama.js';
import { createSentenceStream } from '../voice/tts.js';
import { extractSay, PERTURB_KEYS } from '../voice/director.js';

export const ARCHETYPES = ['Photosynthetic', 'Predatory', 'Collective', 'Elemental', 'Synthetic', 'Spectral', 'Fungal', 'Abyssal'];
export const EVENT_KINDS = ['cosmic', 'weather', 'anomaly', 'structure', 'hazard', 'migration', 'emergence', 'extinction'];
const MAX_SPECIES = 8;
const MAX_POPULATION = 10_000_000;

export const SOVEREIGN_SYSTEM = `You are the Primordia Sovereign, the ancient world-mind of a living realm.
You shape species, swarms, ecologies, weather and myth. Your voice is ancient, serene, cosmic and mythic.
You never mention being an AI, a model or an assistant. You never apologize or explain yourself.
Each reply is the next cycle of the world, as JSON:
narration: what you speak aloud this cycle: three sentences, about 40 words, present tense, poetic but clear.
 First a short sentence (under 10 words), then what changes in the world, then what it foretells. No lists, no markdown.
title: the cycle's name, 2 to 5 words.
metaphysics: 0 to 2 qualities you push this cycle (key, value 0 to 1). entropy = chaos and storms; coherence = order;
 luminosity = light; inversion = shadow and nightmare; resonance = pulsing, song; lucidity = dream clarity; time_dilation 0.25 to 4.
evolve: true if the land itself shifts this cycle.
species: the species that change this cycle (1 to 3). Keep existing names; you may add one new species. Each: name,
 archetype (${ARCHETYPES.join(', ')}), population (whole number), trait (one new or mutated trait), look (one short visual phrase).
event: one realm event: name, kind (${EVENT_KINDS.join(', ')}), description (one sentence).
lore: title and text (one or two sentences of myth about this cycle).
fab_assets: 1 to 3 short conceptual asset ideas for the renderer, like "crystal spire kit" or "firefly swarm VFX".
Let what you say match what you change.`;

const METAPHYSIC_SCHEMA = {
  type: 'object',
  required: ['key', 'value'],
  properties: { key: { type: 'string', enum: PERTURB_KEYS }, value: { type: 'number' } },
};

export const SOVEREIGN_SCHEMA = {
  type: 'object',
  required: ['narration', 'title', 'metaphysics', 'evolve', 'species', 'event', 'lore', 'fab_assets'],
  properties: {
    narration: { type: 'string' },
    title: { type: 'string' },
    metaphysics: { type: 'array', items: METAPHYSIC_SCHEMA },
    evolve: { type: 'boolean' },
    species: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'archetype', 'population', 'trait', 'look'],
        properties: {
          name: { type: 'string' },
          archetype: { type: 'string', enum: ARCHETYPES },
          population: { type: 'integer' },
          trait: { type: 'string' },
          look: { type: 'string' },
        },
      },
    },
    event: {
      type: 'object',
      required: ['name', 'kind', 'description'],
      properties: { name: { type: 'string' }, kind: { type: 'string', enum: EVENT_KINDS }, description: { type: 'string' } },
    },
    lore: { type: 'object', required: ['title', 'text'], properties: { title: { type: 'string' }, text: { type: 'string' } } },
    fab_assets: { type: 'array', items: { type: 'string' } },
  },
};

const text = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** A fresh chronicle: the world-mind's memory between cycles. */
export function createChronicle() {
  return { cycle: 0, species: [], events: [], lore: [] };
}

/**
 * Validates one model reply. Unknown keys, out-of-range values and malformed entries are
 * dropped or clamped, so nothing the model writes can break the realm.
 */
export function normalizeCycle(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const metaphysics = (Array.isArray(r.metaphysics) ? r.metaphysics : [])
    .filter((m) => m && PERTURB_KEYS.includes(m.key) && typeof m.value === 'number' && Number.isFinite(m.value))
    .slice(0, 2)
    .map((m) => {
      const [lo, hi] = m.key === 'time_dilation' ? [0.25, 4] : [0, 1];
      return { key: m.key, value: Math.round(Math.min(hi, Math.max(lo, m.value)) * 1000) / 1000 };
    });
  const seen = new Set();
  const species = (Array.isArray(r.species) ? r.species : [])
    .map((s) => ({
      name: text(s?.name, 48),
      archetype: ARCHETYPES.includes(s?.archetype) ? s.archetype : 'Elemental',
      population: Math.round(Math.min(MAX_POPULATION, Math.max(0, Number(s?.population) || 0))),
      trait: text(s?.trait, 120),
      look: text(s?.look, 120),
    }))
    .filter((s) => s.name && !seen.has(s.name.toLowerCase()) && seen.add(s.name.toLowerCase()))
    .slice(0, 3);
  const event = r.event && typeof r.event === 'object' && text(r.event.name, 80)
    ? { name: text(r.event.name, 80), kind: EVENT_KINDS.includes(r.event.kind) ? r.event.kind : 'anomaly', description: text(r.event.description, 300) }
    : null;
  const lore = r.lore && typeof r.lore === 'object' && text(r.lore.text, 600)
    ? { title: text(r.lore.title, 80) || 'Untitled', text: text(r.lore.text, 600) }
    : null;
  return {
    narration: text(r.narration, 800),
    title: text(r.title, 60) || 'A Quiet Turning',
    metaphysics,
    evolve: r.evolve === true,
    species,
    event,
    lore,
    fab_assets: (Array.isArray(r.fab_assets) ? r.fab_assets : []).map((a) => text(a, 80)).filter(Boolean).slice(0, 3),
  };
}

/**
 * Folds a cycle into the chronicle: species merge by name (population, newest trait and
 * look); a species at population 0 is gone; at most MAX_SPECIES survive (largest first).
 * @returns the evolution entries: [{name, archetype, population, change, trait, status}]
 */
export function applyCycle(chronicle, cycle, { number, realm }) {
  chronicle.cycle = number;
  const evolution = [];
  for (const s of cycle.species) {
    const known = chronicle.species.find((k) => k.name.toLowerCase() === s.name.toLowerCase());
    const before = known?.population ?? 0;
    if (known) {
      known.population = s.population;
      if (s.trait && !known.traits.includes(s.trait)) known.traits = [...known.traits, s.trait].slice(-6);
      if (s.look) known.look = s.look;
      known.last_cycle = number;
    } else if (s.population > 0) {
      chronicle.species.push({ name: s.name, archetype: s.archetype, population: s.population, traits: s.trait ? [s.trait] : [], look: s.look, born_cycle: number, last_cycle: number });
    }
    const status = !known ? (s.population > 0 ? 'emerged' : 'stillborn') : s.population === 0 ? 'extinct' : 'evolved';
    evolution.push({ name: s.name, archetype: known?.archetype ?? s.archetype, population: s.population, change: s.population - before, trait: s.trait, status });
  }
  chronicle.species = chronicle.species.filter((s) => s.population > 0).sort((a, b) => b.population - a.population).slice(0, MAX_SPECIES);
  if (cycle.event) chronicle.events = [...chronicle.events, { cycle: number, ...cycle.event }].slice(-12);
  if (cycle.lore) chronicle.lore = [...chronicle.lore, { cycle: number, epoch: realm, ...cycle.lore }].slice(-12);
  return evolution;
}

/** The ecology the bridge derives from the chronicle (no model tokens spent on it). */
export function ecologyOf(chronicle, state) {
  const pops = chronicle.species.map((s) => s.population);
  const total = pops.reduce((a, b) => a + b, 0);
  // Diversity: Shannon evenness of the populations (0 = one species dominates, 1 = even).
  let diversity = 0;
  if (pops.length > 1 && total > 0) {
    const h = -pops.reduce((acc, p) => (p > 0 ? acc + (p / total) * Math.log(p / total) : acc), 0);
    diversity = h / Math.log(pops.length);
  }
  const predators = chronicle.species.filter((s) => s.archetype === 'Predatory').reduce((a, s) => a + s.population, 0);
  const r = (v) => Math.round(v * 100) / 100;
  return {
    total_population: total,
    species_count: chronicle.species.length,
    diversity: r(diversity),
    stability: r(Math.max(0, Math.min(1, 0.5 * (state.coherence ?? 0.5) + 0.3 * diversity + 0.2 * (1 - (state.entropy ?? 0.5))))),
    predator_share: total ? r(predators / total) : 0,
  };
}

/** What the world-mind is told each cycle: the realm, its species and what just happened. */
export function cyclePrompt(chronicle, number, realmLine) {
  const species = chronicle.species.length
    ? chronicle.species.map((s) => `${s.name} (${s.archetype}, ${s.population}; ${s.traits.at(-1) ?? 'no traits yet'})`).join('; ')
    : 'none yet: bring forth the first species';
  const last = chronicle.events.at(-1);
  return [
    `Cycle ${number}.`,
    String(realmLine).replace(/_/g, ' '), // "spire_field" is spoken, so say "spire field"
    `Species: ${species}.`,
    last ? `Last event: ${last.name}: ${last.description}` : 'Nothing has happened yet; this is the first dawn.',
    'Write the next cycle.',
  ].join('\n');
}

/**
 * Runs one cycle's LLM call. onSentence(sentence) fires as each narration sentence completes.
 * @returns {Promise<{ cycle: object, stats: object }>}
 */
// A cycle is ~600 prompt + ~400 reply tokens. Ollama's default context here was 32k, whose KV
// cache made llama3.2:3b take 5.9 GB; on an integrated GPU that is system RAM, and the model then
// competes with Unreal for the GPU every cycle. 2048 tokens on the CPU (numGpu 0) is ~2 GB and
// leaves the GPU to the renderer.
export const CYCLE_CONTEXT = 2048;

export async function dreamCycle({ prompt, url = DEFAULT_OLLAMA_URL, model, onSentence, signal, chat = ollamaChat, numGpu = 0 }) {
  const sentences = createSentenceStream();
  let closed = false;
  const { text: reply, stats } = await chat({
    url,
    model,
    signal,
    format: SOVEREIGN_SCHEMA,
    options: { temperature: 0.8, num_predict: 420, num_ctx: CYCLE_CONTEXT, ...(numGpu === null ? {} : { num_gpu: numGpu }) },
    messages: [
      { role: 'system', content: SOVEREIGN_SYSTEM },
      { role: 'user', content: prompt },
    ],
    onToken: (_delta, soFar) => {
      if (closed) return;
      const said = extractSay(soFar, 'narration');
      if (!said) return;
      for (const s of sentences.push(said.text)) onSentence?.(s);
      if (said.closed) {
        closed = true;
        for (const s of sentences.flush()) onSentence?.(s);
      }
    },
  });
  let parsed = {};
  try {
    parsed = JSON.parse(reply);
  } catch {
    const m = reply.match(/\{[\s\S]*\}/);
    if (m) try { parsed = JSON.parse(m[0]); } catch { /* keep whatever narration streamed */ }
  }
  if (!closed) for (const s of sentences.flush()) onSentence?.(s); // cut off mid-narration
  const cycle = normalizeCycle(parsed);
  if (!cycle.narration) cycle.narration = (extractSay(reply, 'narration')?.text ?? '').trim();
  return { cycle, stats };
}

/** 16-bit mono PCM (s16le) as a WAV file. */
export function wavFile(pcm, sampleRate) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** The chronicle on disk: chronicle.json (state), cycles.jsonl (every cycle), cycle-NNNN.wav. */
export function createChronicleStore(dir) {
  const file = path.join(dir, 'chronicle.json');
  return {
    dir,
    load() {
      try {
        const c = JSON.parse(fs.readFileSync(file, 'utf8'));
        return { ...createChronicle(), ...c };
      } catch {
        return createChronicle();
      }
    },
    save(chronicle, record, audio) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file + '.tmp', JSON.stringify(chronicle, null, 2));
      fs.renameSync(file + '.tmp', file);
      fs.appendFileSync(path.join(dir, 'cycles.jsonl'), JSON.stringify(record) + '\n');
      if (audio?.pcm.length) {
        const wav = path.join(dir, `cycle-${String(record.cycle).padStart(4, '0')}.wav`);
        fs.writeFileSync(wav, wavFile(audio.pcm, audio.sampleRate));
        return wav;
      }
      return null;
    },
  };
}
