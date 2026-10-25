// Live check of the Unreal "Generate Realm With Ollama" pipeline against a local Ollama:
// same prompt + JSON schema (plugin Resources/Ollama/realm_prompt.json), same streaming
// NDJSON parsing, same repair rules as PrimordiaOllamaRealm.cpp, then the bridge's own
// PRS-1 validator.
//
//   node examples/ollama-realm-check.js [model ...]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateManifest } from '../src/realm/prs1.js';
import { repairManifest } from './ollama-realm-repair.js';

const OLLAMA = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434';
const resource = JSON.parse(readFileSync(fileURLToPath(new URL('../../unreal/PrimordiaOSRealmBridge/Resources/Ollama/realm_prompt.json', import.meta.url)), 'utf8'));
// qwen2.5:7b follows descriptions better but is ~3x slower on CPU-only machines; pass it explicitly.
// Note: Node's fetch gives up if no response headers arrive within 300 s (cold 7B load on CPU).
const models = process.argv.slice(2).length ? process.argv.slice(2) : ['llama3.2:3b'];
const prompts = [
  'A calm archipelago of floating islands above a silver sea, lit by a slow golden heartbeat.',
  'A nightmare cathedral of inverted light, where shadows are brighter than flames and time stutters.',
];

async function chatStream(model, messages, format) {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, format, stream: true, think: false, keep_alive: '15m', options: { temperature: 0.8 } }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  // Split on raw newline bytes, like the C++ client, before decoding UTF-8.
  let pending = Buffer.alloc(0);
  let text = '';
  let tokens = 0;
  let stats = {};
  for await (const chunk of res.body) {
    pending = Buffer.concat([pending, chunk]);
    let nl;
    while ((nl = pending.indexOf(0x0a)) >= 0) {
      const line = JSON.parse(pending.subarray(0, nl).toString('utf8'));
      pending = pending.subarray(nl + 1);
      if (line.error) throw new Error(line.error);
      if (line.message?.content) { text += line.message.content; tokens++; }
      if (line.done) stats = line;
    }
  }
  return { text, tokens, tps: stats.eval_count / (stats.eval_duration / 1e9), load: stats.load_duration / 1e9 };
}

let failures = 0;
for (const model of models) {
  for (const prompt of prompts) {
    const t0 = Date.now();
    try {
      const r = await chatStream(model, [{ role: 'system', content: resource.system }, { role: 'user', content: prompt }], resource.schema);
      const raw = JSON.parse(r.text);
      const { manifest, repairs } = repairManifest(raw, 0);
      const errors = validateManifest(manifest);
      if (errors.length) failures++;
      console.log(`\n[${model}] ${((Date.now() - t0) / 1000).toFixed(1)}s, ${r.tokens} chunks, ${r.tps.toFixed(1)} tok/s, load ${r.load.toFixed(1)}s`);
      console.log(`  prompt:   ${prompt.slice(0, 70)}...`);
      console.log(`  realm:    "${manifest.realm_name}"  layers=${manifest.layers.map((l) => l.kind).join(',')}  topology=${manifest.topology.kind}/${manifest.topology.node_count}  glyphs=${manifest.glyphs.map((g) => g.kind).join(',')}`);
      const m = manifest.metaphysics;
      console.log(`  meta:     entropy=${m.entropy} luminosity=${m.luminosity} coherence=${m.coherence} inversion=${m.inversion} lucidity=${m.lucidity} dilation=${m.time_dilation}`);
      console.log(`  repairs:  ${repairs.length ? repairs.join('; ') : 'none'}`);
      console.log(`  PRS-1:    ${errors.length ? 'INVALID ' + errors.slice(0, 4).join('; ') : 'valid'}`);
    } catch (err) {
      failures++;
      console.log(`\n[${model}] FAILED: ${err.message}`);
    }
  }
}
process.exit(failures ? 1 : 0);
