#!/usr/bin/env node
// Overnight Unreal batch: approved catalog pieces that are not in Unreal yet go into the PrimordiaRealms
// project as static Nanite meshes under /Game/ThirdParty/<Genre>Kit/, then get marked imported.
//
//   node unreal/batch_import.mjs            what the 02:30 scheduled task runs (all guards on)
//   node unreal/batch_import.mjs --now      skip the time window and idle check (Unreal must still be closed)
//   node unreal/batch_import.mjs --dry-run  list what would be imported, change nothing
//   options: --limit <n>  --no-blender
//
// Guards (it never runs while Shane works): Unreal Editor not running, inside the window (default 01:00-06:00),
// keyboard/mouse idle for 20 min, 5 GB free disk, one batch at a time. It uses the commandlet
// (UnrealEditor-Cmd -run=pythonscript), so no editor window opens.
//
// Per piece: download the .glb (a signed URL from the private bucket), check its sha256 against the recipe's
// mesh_sha256, optionally finish it in Blender (bevels + weighted normals; Primordia-cad/kernel/blender.ts),
// then import with the look-dev skill's import_asset.py through unreal/import_batch.py.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadConfig, loadEnv } from '../workshop/config.mjs';
import { openCatalog } from '../workshop/host.mjs';
import { PATHS } from '../workshop/paths.mjs';
import { freeDiskGB, idleSeconds, running, UNREAL_PROCESSES } from '../workshop/system.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const val = (f) => { const i = argv.indexOf(`--${f}`); return i >= 0 ? argv[i + 1] : undefined; };
const config = loadConfig();
const U = config.unreal;
const say = (m) => process.stdout.write(`${new Date().toISOString()} unreal-batch: ${m}\n`);

function inWindow(window, now = new Date()) {
  const [a, b] = window.split('-').map((t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; });
  const t = now.getHours() * 60 + now.getMinutes();
  return a <= b ? t >= a && t < b : t >= a || t < b;
}

async function guards() {
  const problems = [];
  const open = await running(UNREAL_PROCESSES);
  if (open.length) problems.push(`Unreal is running (${open.join(', ')})`);
  if (!has('now')) {
    if (!inWindow(U.window)) problems.push(`outside the ${U.window} window (use --now to run anyway)`);
    const idle = await idleSeconds();
    if (idle !== null && idle < U.minIdleMinutes * 60) problems.push(`the PC was used ${Math.round(idle / 60)} min ago (needs ${U.minIdleMinutes} min idle)`);
  }
  for (const [what, p] of [['engine', U.engine], ['project', U.project], ['import_asset.py', PATHS.importAsset]]) {
    if (!existsSync(p)) problems.push(`${what} not found: ${p}`);
  }
  const disk = await freeDiskGB(path.dirname(U.project));
  if (disk !== null && disk < U.minFreeDiskGB) problems.push(`only ${disk.toFixed(1)} GB free`);
  return problems;
}

async function lock() {
  const file = path.join(PATHS.data, 'unreal-batch.lock');
  try {
    const s = await stat(file);
    if (Date.now() - s.mtimeMs < 3 * 3600_000) return null;
  } catch { /* no lock */ }
  await mkdir(PATHS.data, { recursive: true });
  await writeFile(file, String(process.pid));
  return async () => rm(file, { force: true });
}

async function fetchGlb(catalog, row) {
  if (catalog.kind === 'supabase') {
    const url = await catalog.signedUrl(row.glb_path, 900);
    const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`download ${row.name}: HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return catalog.download(row.glb_path);
}

function runCommandlet(manifestFile, resultsFile) {
  return new Promise((resolve) => {
    const args = [U.project, '-run=pythonscript', `-script=${path.join(HERE, 'import_batch.py')}`, '-unattended', '-nop4', '-nosplash', '-NoSound'];
    const child = spawn(U.engine, args, {
      windowsHide: true, stdio: 'ignore',
      env: { ...process.env, PRIM_BATCH_MANIFEST: manifestFile, PRIM_BATCH_RESULTS: resultsFile, PRIM_IMPORT_ASSET_PY: PATHS.importAsset },
    });
    const timer = setTimeout(() => { say(`commandlet still running after ${U.timeoutMinutes} min; stopping it`); child.kill(); }, U.timeoutMinutes * 60_000);
    child.on('exit', (code) => { clearTimeout(timer); resolve(code); });
    child.on('error', (e) => { clearTimeout(timer); say(`could not start the commandlet: ${e.message}`); resolve(-1); });
  });
}

async function main() {
  const problems = await guards();
  if (problems.length) { say(`not running: ${problems.join('; ')}`); return 0; }
  const unlock = await lock();
  if (!unlock) { say('another batch holds the lock'); return 0; }
  try {
    const catalog = await openCatalog(loadEnv(), { log: say });
    const limit = Number(val('limit')) || U.maxPerBatch;
    const rows = (await catalog.listAssets({ verdict: 'approved', imported: false, needsGlb: true, limit: 200 })).slice(0, limit);
    if (!rows.length) { say('nothing approved is waiting for Unreal'); return 0; }
    say(`${rows.length} approved piece(s) to import${has('dry-run') ? ' (dry run)' : ''}: ${rows.map((r) => r.name).join(', ')}`);
    if (has('dry-run')) return 0;

    const genres = await import(pathToFileURL(path.join(PATHS.cad, 'genres', 'index.ts')).href);
    let blender = null;
    if (U.blender.enabled && !has('no-blender')) {
      const b = await import(pathToFileURL(path.join(PATHS.cad, 'kernel', 'blender.ts')).href);
      if (b.findBlender()) blender = b; else say('Blender not found; importing the kernel meshes as they are');
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const work = path.join(PATHS.staging, stamp);
    await mkdir(work, { recursive: true });
    const items = [], skipped = [];
    for (const row of rows) {
      const pack = genres.GENRES[row.genre];
      if (!pack) { skipped.push({ name: row.name, why: `unknown genre ${row.genre}` }); continue; }
      try {
        const bytes = await fetchGlb(catalog, row);
        const sha = createHash('sha256').update(bytes).digest('hex');
        if (sha !== row.mesh_sha256) { skipped.push({ name: row.name, why: `downloaded .glb sha ${sha.slice(0, 12)} differs from the recipe` }); continue; }
        const dir = path.join(work, path.basename(pack.unrealFolder));
        await mkdir(dir, { recursive: true });
        let src = path.join(dir, `${row.name}.kernel.glb`);
        await writeFile(src, bytes);
        let finish = null;
        if (blender) {
          try {
            // Blender's glTF importer fails on paths over Windows' 260-character limit: finish in a short folder.
            const short = await mkdtemp(path.join(os.tmpdir(), 'rae-'));
            const shortIn = path.join(short, 'in.glb');
            await writeFile(shortIn, bytes);
            finish = blender.finishMesh(shortIn, short, { name: row.name, bake: U.blender.bake, preview: 0, fbx: false, draco: false });
            src = path.join(dir, `${row.name}.glb`);
            await copyFile(path.join(short, `${row.name}.glb`), src);
            await rm(short, { recursive: true, force: true });
            say(`blender ${row.name}: ${finish.triangles_in} -> ${finish.triangles_out} tris, bevel ${finish.bevel_m} m, ${finish.seconds}s`);
          } catch (e) {
            say(`blender ${row.name} failed, importing the kernel mesh: ${e.message.split('\n')[0]}`);
          }
        }
        items.push({ id: row.id, src, dest: pack.unrealFolder, name: row.name, kind: 'mesh', finish: finish ? { triangles: finish.triangles_out, bevel_m: finish.bevel_m } : null });
      } catch (e) {
        skipped.push({ name: row.name, why: e.message });
      }
    }
    for (const s of skipped) say(`skip ${s.name}: ${s.why}`);
    if (!items.length) return 1;

    const manifestFile = path.join(work, 'manifest.json'), resultsFile = path.join(work, 'results.json');
    await writeFile(manifestFile, JSON.stringify({ items }, null, 1));
    say(`commandlet: importing ${items.length} piece(s), no editor window (this takes a few minutes)`);
    const t0 = Date.now();
    const code = await runCommandlet(manifestFile, resultsFile);
    let results = { items: [] };
    try { results = JSON.parse(await readFile(resultsFile, 'utf8')); } catch { /* commandlet died before the first item */ }
    const now = new Date().toISOString();
    let imported = 0;
    for (const r of results.items) {
      const item = items.find((i) => i.name === r.name);
      if (!r.ok || !item) { say(`FAILED ${r.name}: ${r.error ?? 'unknown'}`); continue; }
      const row = rows.find((x) => x.id === item.id);
      const flags = [...(row.flags ?? []).filter((f) => !f.startsWith('unreal:')), ...(item.finish ? [`unreal: blender-finished, ${item.finish.triangles} tris`] : [])];
      await catalog.updateAsset(item.id, { imported_to_unreal: true, unreal_path: r.path, imported_at: now, flags });
      imported++;
      say(`imported ${r.path} (${r.class}, nanite ${r.nanite}, slots ${r.slots.join('/')}, ${r.size_m.join(' x ')} m)`);
    }
    const report = { at: now, seconds: Math.round((Date.now() - t0) / 1000), exit: code, imported, attempted: items.length, skipped, results: results.items };
    await mkdir(PATHS.logs, { recursive: true });
    await writeFile(path.join(PATHS.logs, `unreal-batch-${stamp}.json`), JSON.stringify(report, null, 1));
    say(`done: ${imported}/${items.length} imported in ${report.seconds}s (commandlet exit ${code}); report in ${PATHS.logs}`);
    return imported === items.length ? 0 : 1;
  } finally {
    await unlock();
  }
}

process.exitCode = await main();
