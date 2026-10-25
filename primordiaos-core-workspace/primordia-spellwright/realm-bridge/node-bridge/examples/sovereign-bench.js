// One Primordia Sovereign cycle against the real Ollama and Kokoro, outside the bridge:
//   node examples/sovereign-bench.js [model] [voice] [out.wav]
// Prints when the first sentence was ready, the cycle JSON, and writes the narration as a WAV.
import fs from 'node:fs';
import { createTTS, floatToPcm16 } from '../src/voice/tts.js';
import { createChronicle, cyclePrompt, dreamCycle, wavFile } from '../src/sovereign/sovereign.js';

const [model = 'llama3.2:3b', voice = 'bf_emma', out = 'sovereign-sample.wav'] = process.argv.slice(2);
const t0 = performance.now();
const since = () => ((performance.now() - t0) / 1000).toFixed(1);

const tts = await createTTS({ voice });
console.log(`kokoro ready at ${since()}s`);
const realm = 'Current realm: "Lumenne Hollow" (layers: ground, sky, lattice, ring, spire_field). entropy 0.35, luminosity 0.7, coherence 0.6, resonance 0.5, inversion 0.2, lucidity 0.55, time_dilation 1.';
const pcm = [];
let chain = Promise.resolve();
let firstAudio = null;
const llmStart = performance.now();
const { cycle, stats } = await dreamCycle({
  prompt: cyclePrompt(createChronicle(), 1, realm),
  model,
  onSentence: (s) => {
    console.log(`  sentence at ${since()}s: ${s}`);
    chain = chain.then(async () => {
      const { samples } = await tts.synthesize(s, voice);
      firstAudio ??= since();
      pcm.push(floatToPcm16(samples));
    });
  },
});
console.log(`llm done in ${((performance.now() - llmStart) / 1000).toFixed(1)}s (${stats.genTokens} tokens, ${stats.tokensPerSecond.toFixed(1)} tok/s)`);
await chain;
const audio = Buffer.concat(pcm);
fs.writeFileSync(out, wavFile(audio, 24000));
console.log(`first audio at ${firstAudio}s; ${(audio.length / 48000).toFixed(1)}s of speech -> ${out}`);
console.log(JSON.stringify(cycle, null, 2));
