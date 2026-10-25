// Make the realm talk from the command line. The bridge broadcasts the audio to
// every connected client, so Unreal plays it at the soul glyph while this runs.
//
//   node examples/say.js "Antigravity matrix initialized."     speak this text verbatim
//   node examples/say.js --ask "Make the realm stormy."        LLM decides what to say and do
import WebSocket from 'ws';

const args = process.argv.slice(2);
const ask = args[0] === '--ask';
const text = (ask ? args.slice(1) : args).join(' ').trim();
// (Not PRIMORDIA_BRIDGE: that name is already used for a folder path on this machine.)
const url = process.env.PRIMORDIA_BRIDGE_URL ?? 'ws://127.0.0.1:7777';
if (!text) {
  console.log('usage: node examples/say.js "text"   |   node examples/say.js --ask "question"');
  process.exit(1);
}

const command = ask ? 'converse' : 'speak';
const ws = new WebSocket(url);
const t0 = performance.now();
const secs = () => ((performance.now() - t0) / 1000).toFixed(1);
let firstAudio = null;

ws.on('error', (err) => {
  console.error(`Cannot reach the bridge at ${url}: ${err.message}`);
  process.exit(1);
});
ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'hello', client: 'say', version: '1.0.0', streams: ['voice'] }));
  ws.send(JSON.stringify({ type: 'command', name: command, args: ask ? { input: text } : { text } }));
  console.log(ask ? `> ${text}` : `speaking: "${text}"`);
});
ws.on('message', (raw) => {
  const p = JSON.parse(raw);
  if (p.type === 'voice' && p.payload.text) {
    firstAudio ??= secs();
    console.log(`  [${secs()}s] ${p.payload.text}`);
  }
  if (p.type === 'ack' && p.payload.command === command) {
    const a = p.payload;
    if (a.status === 'started') return;
    if (!a.ok) {
      console.error(`failed: ${a.error}`);
      process.exit(1);
    }
    if (ask) console.log(`  actions: ${a.action_results?.join('; ') || 'none'}`);
    console.log(`done: first audio ${firstAudio}s, ${a.audioSeconds}s of speech, total ${secs()}s`);
    ws.close();
  }
});
ws.on('close', () => process.exit(0));
