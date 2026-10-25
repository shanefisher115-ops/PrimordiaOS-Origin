// Benchmark: LLM writes the whole PRS-1 manifest ("full", what Generate Realm With
// Ollama does inside Unreal) vs LLM writes a compact intent that Worldforge
// expands ("intent", the bridge's generate_realm command).
//
//   node examples/realm-design-bench.js [model]      (default llama3.2:3b)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chat, DEFAULT_OLLAMA_URL } from '../src/llm/ollama.js';
import { designRealm } from '../src/realm/design.js';
import { validateManifest } from '../src/realm/prs1.js';
import { repairManifest } from './ollama-realm-repair.js';

const url = process.env.OLLAMA_URL ?? DEFAULT_OLLAMA_URL;
const model = process.argv[2] ?? 'llama3.2:3b';
const full = JSON.parse(readFileSync(fileURLToPath(new URL('../../unreal/PrimordiaOSRealmBridge/Resources/Ollama/realm_prompt.json', import.meta.url)), 'utf8'));
const prompts = [
  'A calm archipelago of floating islands above a silver sea, lit by a slow golden heartbeat.',
  'A nightmare cathedral of inverted light, where shadows are brighter than flames and time stutters.',
  'A frozen lattice of crystal spires humming one endless note under a violet aurora.',
];

async function runFull(description) {
  const { text, stats } = await chat({
    url, model, format: full.schema, options: { temperature: 0.8, num_predict: 1500 },
    messages: [{ role: 'system', content: full.system }, { role: 'user', content: description }],
  });
  const { manifest } = repairManifest(JSON.parse(text));
  return { manifest, stats };
}

async function runIntent(description) {
  const { manifest, stats } = await designRealm(description, { url, model });
  return { manifest, stats };
}

console.log(`model ${model} @ ${url}`);
process.stdout.write('loading model... ');
await chat({ url, model, messages: [{ role: 'user', content: 'hi' }], options: { num_predict: 1 } });
console.log('ready\n');

const rows = [];
for (const [approach, fn] of [['full', runFull], ['intent', runIntent]]) {
  for (const p of prompts) {
    try {
      const { manifest, stats } = await fn(p);
      const valid = validateManifest(manifest).length === 0;
      rows.push({ approach, seconds: stats.seconds, tokens: stats.genTokens, tps: stats.tokensPerSecond, prompt: stats.promptTokens, ptps: stats.promptTokensPerSecond, valid, name: manifest.realm_name, layers: manifest.layers.map((l) => l.kind).join(',') });
    } catch (err) {
      rows.push({ approach, error: err.message });
    }
    const r = rows.at(-1);
    console.log(r.error
      ? `${approach.padEnd(6)} FAILED ${r.error}`
      : `${approach.padEnd(6)} ${r.seconds.toFixed(1).padStart(6)}s  ${String(r.tokens).padStart(4)} tok  ${r.tps.toFixed(1)} tok/s  prompt ${r.prompt} tok @ ${r.ptps.toFixed(0)}/s  ${r.valid ? 'valid' : 'INVALID'}  "${r.name}"  [${r.layers}]`);
  }
}

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const summary = (a) => { const ok = rows.filter((r) => r.approach === a && !r.error); return { s: median(ok.map((r) => r.seconds)), t: median(ok.map((r) => r.tokens)), n: ok.length }; };
const f = summary('full');
const i = summary('intent');
console.log(`\nmedian  full:   ${f.s?.toFixed(1)} s, ${f.t} tokens  (${f.n}/${prompts.length} ok)`);
console.log(`median  intent: ${i.s?.toFixed(1)} s, ${i.t} tokens  (${i.n}/${prompts.length} ok)`);
if (f.s && i.s) console.log(`speed-up: ${(f.s / i.s).toFixed(1)}x`);
