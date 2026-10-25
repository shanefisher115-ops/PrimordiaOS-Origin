// End-to-end voice latency on this machine: converse -> LLM {say, action} ->
// Kokoro -> voice packets, through a real bridge and a WebSocket client.
//   node examples/converse-bench.js [out.wav]
import { writeFileSync } from 'node:fs';
import WebSocket from 'ws';
import { createBridge } from '../src/server.js';

const wavPath = process.argv[2];
const inputs = [
  'Hello. Who are you?',
  'Make the realm stormy and chaotic.',
  'Calm everything down and let the light return.',
];

const bridge = await createBridge({ port: 0, log: () => {}, evolveSeconds: 0, voicePreload: false });
const ws = new WebSocket(`ws://127.0.0.1:${bridge.port}`);
await new Promise((r) => ws.on('open', r));

function converse(input, captureWav) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    let firstPacketAt = null;
    const pcm = [];
    const onMessage = (raw) => {
      const p = JSON.parse(raw);
      if (p.type === 'voice') {
        firstPacketAt ??= (performance.now() - t0) / 1000;
        if (p.payload.pcm) pcm.push(Buffer.from(p.payload.pcm, 'base64'));
      }
      if (p.type === 'ack' && p.payload.command === 'converse' && p.payload.status !== 'started') {
        ws.off('message', onMessage);
        if (captureWav) writeWav(captureWav, Buffer.concat(pcm), 24000);
        resolve({ ...p.payload, clientFirstAudio: firstPacketAt });
      }
    };
    ws.on('message', onMessage);
    ws.send(JSON.stringify({ type: 'command', name: 'converse', args: { input } }));
  });
}

function writeWav(path, pcm, rate) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  writeFileSync(path, Buffer.concat([h, pcm]));
}

// Warm both models so the numbers reflect steady state, not first-load.
process.stdout.write('warming LLM + Kokoro... ');
const warm = await converse('Say ok.');
console.log(warm.ok ? 'ready' : `FAILED: ${warm.error}`);

for (const [i, input] of inputs.entries()) {
  const r = await converse(input, i === 1 ? wavPath : null);
  if (!r.ok) { console.log(`\n"${input}" FAILED: ${r.error}`); continue; }
  console.log(`\n> ${input}`);
  console.log(`  say:    "${r.say}"`);
  console.log(`  actions: ${r.action_results.join('; ') || 'none'}`);
  console.log(`  first audio ${r.firstAudioSeconds}s | LLM ${r.llm_seconds}s (${r.tokens} tok) | total ${r.seconds}s | speech ${r.audioSeconds}s (synth ${r.synthSeconds}s)`);
}
ws.close();
await bridge.close();
