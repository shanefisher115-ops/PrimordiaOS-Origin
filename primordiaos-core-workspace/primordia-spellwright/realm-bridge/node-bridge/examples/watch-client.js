// Debug client: connects like Unreal does and prints per-stream rates.
//   node examples/watch-client.js [ws://127.0.0.1:7777]
import WebSocket from 'ws';
import { validatePacket } from '../src/schemas.js';

const url = process.argv[2] ?? 'ws://127.0.0.1:7777';
const ws = new WebSocket(url);
const counts = new Map();
let invalid = 0;

ws.on('open', () => {
  console.log(`connected to ${url}`);
  ws.send(JSON.stringify({ type: 'hello', client: 'watch-client', version: '1.0.0' }));
});

ws.on('message', (raw) => {
  const p = JSON.parse(raw.toString());
  const errors = validatePacket(p);
  if (errors.length) {
    invalid++;
    console.warn(`INVALID ${p.type}/${p.id}:`, errors.slice(0, 3));
  }
  const key = p.op === 'retire' ? `${p.type} (retire)` : p.type;
  counts.set(key, (counts.get(key) ?? 0) + 1);
  if (p.type === 'realm_manifest') {
    const m = p.payload;
    console.log(`manifest ${m.realm_name} rev=${m.revision} layers=${m.layers.map((l) => l.kind).join(',')} topology=${m.topology.kind}/${m.topology.node_count} glyphs=${m.glyphs.length}`);
  }
});

setInterval(() => {
  const line = [...counts].map(([k, n]) => `${k}=${n}/s`).join('  ');
  console.log(`${line}  invalid=${invalid}`);
  counts.clear();
}, 1000);

ws.on('close', () => {
  console.log('disconnected');
  process.exit(0);
});
