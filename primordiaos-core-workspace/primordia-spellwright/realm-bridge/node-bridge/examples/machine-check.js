// Checks a bridge running the machine realm (node src/server.js --modules realms/machine):
// collects packets for a while, validates every one, and summarises what the
// processing layer is showing.
//   node examples/machine-check.js [ws://127.0.0.1:7777] [seconds]
import WebSocket from 'ws';
import { validatePacket } from '../src/schemas.js';

const url = process.argv[2] ?? 'ws://127.0.0.1:7777';
const seconds = Number(process.argv[3] ?? 15);
const ws = new WebSocket(url);
const counts = new Map();
const latest = new Map();
let invalid = 0;

ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', client: 'machine-check' })));
ws.on('message', (raw) => {
  const p = JSON.parse(raw.toString());
  const errors = validatePacket(p);
  if (errors.length) {
    invalid++;
    if (invalid <= 5) console.log(`INVALID ${p.type}/${p.id}: ${errors.slice(0, 3).join('; ')}`);
  }
  counts.set(p.type, (counts.get(p.type) ?? 0) + 1);
  latest.set(`${p.type}/${p.id}`, p);
});
ws.on('error', (e) => {
  console.error(e.message);
  process.exit(1);
});

setTimeout(() => {
  ws.close();
  const get = (key) => latest.get(key)?.payload;
  const manifest = [...latest.values()].find((p) => p.type === 'realm_manifest')?.payload;
  const web = [...latest.values()].find((p) => p.type === 'cosmic_web')?.payload;
  const soul = get('soul_unification/soul');
  const weave = get('fate_weave/weave');
  const heart = get('heart_beat/heart');
  console.log(`rates over ${seconds}s:`, [...counts].map(([t, n]) => `${t}=${(n / seconds).toFixed(1)}/s`).join(' '));
  console.log(`invalid packets: ${invalid}`);
  if (manifest) {
    console.log(`realm: ${manifest.realm_name} (${manifest.realm_id}) rev ${manifest.revision}`);
    console.log(`layers: ${manifest.layers.map((l) => `${l.kind}@${l.density}`).join(', ')}`);
    console.log(`metaphysics: ${JSON.stringify(manifest.metaphysics)}`);
    for (const g of manifest.glyphs) console.log(`  glyph ${g.id.padEnd(8)} ${g.kind.padEnd(5)} scale ${g.scale} sym ${g.symmetry} "${g.intent}"`);
  }
  if (heart) console.log(`heart: ${heart.bpm.toFixed(1)} bpm, essence ${heart.essence}`);
  if (weave) console.log(`weave: ${weave.threads.map((t) => `${t.id}(w ${t.width}, ${t.fate})`).join(' ')}`);
  if (soul) console.log(`soul: unity ${soul.unity}, crown "${soul.glyph.intent}", orbiting ${soul.fragments.map((f) => f.id).join(' ')}`);
  if (web) console.log(`process web: rev ${web.rev}, ${web.nodes.length} nodes (${web.nodes.filter((n) => n.kind === 'nexus').map((n) => n.id).join(' ')} nexus)`);
  process.exit(invalid ? 1 : 0);
}, seconds * 1000);
