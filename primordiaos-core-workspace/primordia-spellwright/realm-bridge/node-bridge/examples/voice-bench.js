// Measures Kokoro-82M speech synthesis on this machine.
//   node examples/voice-bench.js [q8|fp32|q4] [voice]
// Real-time factor (RTF) = synthesis time / audio duration: below 1.0 means
// speech is produced faster than it plays, so streaming never stalls.
import { createTTS } from '../src/voice/tts.js';

const dtype = process.argv[2] ?? 'fp32';
const voice = process.argv[3] ?? 'af_heart';
const sentences = [
  'Antigravity matrix initialized at sector zero.',
  'The heart quickens; entropy is rising across the cosmic web.',
  'I have woven a new realm for you, a calm sea of glass bells beneath a violet sky, and its soul is already singing.',
  'Yes.',
];

const rss = () => `${(process.memoryUsage().rss / 1048576).toFixed(0)} MB`;
console.log(`Kokoro-82M ${dtype}, voice ${voice}, ${navigator?.hardwareConcurrency ?? '?'} threads`);
let t = performance.now();
const tts = await createTTS({ dtype, voice });
console.log(`load: ${((performance.now() - t) / 1000).toFixed(1)} s (includes first-run download), rss ${rss()}`);

await tts.synthesize('Warm up.'); // first inference compiles kernels

let totalSynth = 0;
let totalAudio = 0;
for (const s of sentences) {
  t = performance.now();
  const { samples, sampleRate } = await tts.synthesize(s);
  const synth = (performance.now() - t) / 1000;
  const audio = samples.length / sampleRate;
  totalSynth += synth;
  totalAudio += audio;
  console.log(`${synth.toFixed(2).padStart(6)} s synth  ${audio.toFixed(2).padStart(6)} s audio  RTF ${(synth / audio).toFixed(2)}  "${s.slice(0, 60)}"`);
}
console.log(`\noverall RTF ${(totalSynth / totalAudio).toFixed(2)}  (${totalSynth.toFixed(1)} s to make ${totalAudio.toFixed(1)} s of speech), rss ${rss()}`);
