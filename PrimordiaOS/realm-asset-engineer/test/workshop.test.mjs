// Workshop: silhouettes, the brief-notes reader, both catalogs, and a whole loop on a local catalog
// (brief -> forge -> judge -> keep -> review -> publish), plus the gallery API. No browser, no network.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const DATA = mkdtempSync(path.join(tmpdir(), 'rae-test-'));
process.env.RAE_DATA_DIR = DATA;
process.env.RAE_ENV_FILE = path.join(DATA, 'none.env');

const { silhouette, distance, variety } = await import('../workshop/silhouette.mjs');
const { readNotes } = await import('../workshop/ollama.mjs');
const { LocalCatalog, SupabaseCatalog } = await import('../workshop/catalog.mjs');
const { build } = await import('../workshop/forge.mjs');
const { loadConfig } = await import('../workshop/config.mjs');
const { Host, styleFor } = await import('../workshop/host.mjs');
const { createGalleryServer } = await import('../workshop/server.mjs');

after(() => rmSync(DATA, { recursive: true, force: true }));

test('silhouettes: same shape 0 apart, different shapes far apart', () => {
  const spire = build({ genre: 'gothic', generator: 'spire', params: {} });
  const spire2 = build({ genre: 'gothic', generator: 'spire', params: { height: 80, baseWidth: 24 } }); // same proportions, twice the size
  const lamp = build({ genre: 'gothic', generator: 'lamp', params: { arms: 2 } });
  const a = silhouette(spire.solid), b = silhouette(spire2.solid), c = silhouette(lamp.solid);
  assert.equal(distance(a, a), 0);
  assert.ok(distance(a, b) < 0.08, `scaled spire ${distance(a, b)}`);
  assert.ok(distance(a, c) > 0.5, `spire vs lamp ${distance(a, c)}`);
  assert.deepEqual(variety(a, []), { variety: null, nearest: null });
  assert.equal(variety(c, [{ name: 's', silhouette: a }, { name: 'l', silhouette: c }]).nearest, 'l');
});

test('brief notes: generators, negation and mood words, deterministically', () => {
  const r = readNotes('tall slender spires, no lamps', styleFor('gothic'));
  assert.equal(r.bias.height, 0.7);
  assert.equal(r.bias.width, -0.6);
  assert.equal(r.weights.spire, 4);
  assert.equal(r.weights.lamp, 0.05);
  const s = readNotes('an ornate habitat dome', styleFor('scifi'));
  assert.equal(s.weights.dome, 4);
  assert.equal(s.bias.ornament, 0.7);
});

test('local catalog: rows, duplicates, reviews, usage, briefs', async () => {
  const c = await new LocalCatalog({ dir: path.join(DATA, 'cat-a') }).init();
  const r = await c.insertAsset({ name: 'A', genre: 'gothic', generator: 'spire', mesh_sha256: 'x', thumb_bytes: 10 });
  await assert.rejects(c.insertAsset({ name: 'B', genre: 'gothic', generator: 'spire', mesh_sha256: 'x' }), (e) => e.status === 409);
  assert.equal((await c.reviewsSince(null)).length, 0);
  await c.updateAsset(r.id, { verdict: 'approved' });
  const [rev] = await c.reviewsSince(null);
  assert.equal(rev.verdict, 'approved');
  assert.equal((await c.reviewsSince(rev.reviewed_at)).length, 0);
  assert.deepEqual(await c.usage(), { assets: 1, approved: 1, awaiting_review: 0, with_glb: 0, storage_bytes: 10 });
  const b = await c.insertBrief({ genre: 'scifi', count: 3 });
  assert.ok(await c.takeBrief(b.id));
  assert.equal(await c.takeBrief(b.id), null);
  await c.upload('gothic/spire/A.webp', Buffer.from('hi'));
  assert.equal((await c.download('gothic/spire/A.webp')).toString(), 'hi');
  await assert.rejects(c.upload('../escape.txt', Buffer.from('no')));
});

test('supabase catalog: service key stays in headers, routes match PostgREST and Storage', async () => {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, ...opts });
    const u = new URL(url);
    const body = u.pathname.startsWith('/storage/v1/object/sign/') ? { signedURL: '/object/sign/realm-assets/a.webp?token=t' }
      : u.pathname.endsWith('/realm_asset_usage') ? [{ assets: 3 }] : opts.method === 'PATCH' ? [{ id: 'b1', status: 'taken' }] : [];
    return new Response(JSON.stringify(body), { status: 200 });
  };
  const legacy = new SupabaseCatalog({ url: 'https://p.supabase.co/', key: 'eyJlegacy', fetchImpl });
  await legacy.usage();
  assert.equal(calls[0].url, 'https://p.supabase.co/rest/v1/realm_asset_usage?select=*');
  assert.equal(calls[0].headers.apikey, 'eyJlegacy');
  assert.equal(calls[0].headers.authorization, 'Bearer eyJlegacy');
  const modern = new SupabaseCatalog({ url: 'https://p.supabase.co', key: 'sb_secret_x', fetchImpl });
  await modern.takeBrief('b1');
  const take = calls.at(-1);
  assert.equal(take.method, 'PATCH');
  assert.match(take.url, /realm_asset_briefs\?id=eq\.b1&status=eq\.queued$/);
  assert.equal(take.headers.authorization, undefined);
  assert.equal(await modern.signedUrl('a.webp', 60), 'https://p.supabase.co/storage/v1/object/sign/realm-assets/a.webp?token=t');
  await modern.upload('gothic/spire/a.webp', Buffer.from('x'), 'image/webp');
  const up = calls.at(-1);
  assert.equal(up.url, 'https://p.supabase.co/storage/v1/object/realm-assets/gothic/spire/a.webp');
  assert.equal(up.headers['x-upsert'], 'true');
  assert.ok(!JSON.stringify(calls.map((c) => c.url)).includes('sb_secret'), 'key never in a URL');
});

let host, server, base;
before(async () => {
  const config = loadConfig({ previewer: { enabled: false }, rate: { candidatesPerHour: 3600, minGapSeconds: 0 }, standing: { enabled: false }, steer: { enabled: false } });
  const catalog = await new LocalCatalog({ dir: path.join(DATA, 'cat-host') }).init();
  host = await new Host({ config, env: {}, catalog, log: () => {} }).start();
  server = createGalleryServer({ host, token: 'tok' });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { server?.close(); await host?.stop(); });

async function drain(max = 200) {
  for (let i = 0; i < max; i++) {
    const did = await host.tick();
    if (!did.delivered && !did.job && !host.state.jobs.length && !host.state.deliveries.length) return;
  }
  throw new Error('loop did not settle');
}

test('host: a sci-fi brief is built, judged and kept with its recipe and provenance', async () => {
  await host.queueBrief({ brief_id: 'cli-test-1', genre: 'scifi', count: 6 });
  await drain();
  const c = host.state.counters;
  assert.equal(c.built + c.failed, 6);
  assert.equal(c.failed, 0);
  assert.ok(c.kept >= 1, JSON.stringify(c));
  const rows = await host.catalog.listAssets({ genre: 'scifi' });
  assert.equal(rows.length, c.kept);
  for (const r of rows) {
    assert.match(r.name, /^SM_SciFi(ArcologySpire|EnergyPylon|HabitatDome|CommsMast)_[0-9a-f]{6}$/);
    assert.equal(r.manifold_version, '3.5.4');
    assert.match(r.kernel_commit, /^[0-9a-f]{40}$/);
    assert.equal(r.verdict, 'kept');
    assert.ok(r.silhouette && r.scores.total >= r.scores.threshold);
    assert.ok(r.flags.includes('no-thumbnail: previewer unavailable'));
    assert.equal(build(r).sha, r.mesh_sha256, 'the recipe rebuilds the same mesh');
  }
});

test('host + gallery: approve -> the engineer learns and publishes the .glb; API is token-gated', async () => {
  assert.equal((await fetch(`${base}/api/assets`)).status, 401);
  const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { authorization: 'Bearer tok' } });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const list = await (await fetch(`${base}/api/assets?verdict=kept`, { headers: { cookie } })).json();
  assert.ok(list.length >= 1 && !('silhouette' in list[0]));
  const target = list[0];
  const glb = await fetch(`${base}/api/assets/${target.id}/glb`, { headers: { cookie } });
  assert.equal(glb.headers.get('x-regenerated'), 'true');
  assert.equal(glb.headers.get('x-sha-match'), 'true');
  const res = await fetch(`${base}/api/assets/${target.id}/review`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ verdict: 'approved', note: 'good' }) });
  assert.equal((await res.json()).verdict, 'approved');
  await drain();
  const row = await host.catalog.getAsset(target.id);
  assert.equal(row.glb_path, `scifi/${row.generator}/${row.name}.glb`);
  assert.equal(host.state.counters.published, 1);
  const memory = JSON.parse((await import('node:fs')).readFileSync(path.join(DATA, 'agent', 'RealmAssetEngineer', 'state', 'memory.json'), 'utf8'));
  assert.equal(memory.taste[`scifi/${row.generator}`].a, 1);
  const stored = await fetch(`${base}/api/assets/${target.id}/glb`, { headers: { cookie } });
  assert.equal(stored.headers.get('x-regenerated'), null);
  assert.equal((await fetch(`${base}/api/briefs`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ genre: 'nope' }) })).status, 400);
  assert.equal((await fetch(`${base}/api/briefs`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ genre: 'gothic', count: 2 }) })).status, 201);
  assert.equal((await fetch(`${base}/vendor/three/package.json`)).status, 404, 'only build/ and examples/jsm/ are served');
});
