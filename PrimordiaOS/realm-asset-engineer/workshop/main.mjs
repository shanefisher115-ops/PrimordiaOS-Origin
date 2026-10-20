#!/usr/bin/env node
// Realm-asset engineer workshop.
//
//   node workshop/main.mjs                       run 24/7: engineer loop + LAN review gallery
//   node workshop/main.mjs --once [--genre g] [--count n] [--notes "..."] [--no-rate] [--max-ticks n]
//                                                queue one brief (or a standing one) and run until it is judged
//   node workshop/main.mjs --brief <genre> [--count n] [--notes "..."]   queue a brief for the running engineer
//   node workshop/main.mjs --status              counters and catalog usage
//   node workshop/main.mjs --gallery-only        serve the gallery without the loop
import os from 'node:os';
import { loadConfig, loadEnv, galleryToken } from './config.mjs';
import { Host, openCatalog } from './host.mjs';
import { createGalleryServer, lanUrls } from './server.mjs';
import { PATHS } from './paths.mjs';

function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true; else { out[key] = next; i++; }
  }
  return out;
}

const opt = args(process.argv.slice(2));
const config = loadConfig();
const env = loadEnv();
const say = (m) => process.stdout.write(`${new Date().toISOString()} ${m}\n`);

// Lower priority: the engineer must never compete with Shane's foreground work.
try { os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* not allowed here */ }

const catalog = await openCatalog(env, { log: say });

if (opt.brief) {
  const b = await catalog.insertBrief({ genre: opt.brief, count: Number(opt.count) || 4, notes: typeof opt.notes === 'string' ? opt.notes : null, created_by: 'cli' });
  say(`queued brief ${b.id}: ${b.count} x ${b.genre}${b.notes ? ` "${b.notes}"` : ''}`);
  process.exit(0);
}

if (opt.noRate) config.rate = { ...config.rate, candidatesPerHour: 3600, minGapSeconds: 0 };
if (opt.noPreview) config.previewer.enabled = false;
const host = await new Host({ config, env, catalog }).start();

if (opt.status) {
  console.log(JSON.stringify(host.status(), null, 2));
  await host.stop();
  process.exit(0);
}

let server = null;
if (config.gallery.enabled && !opt.once && !opt.noGallery) {
  const token = galleryToken(env);
  server = createGalleryServer({ host, token, env });
  server.listen(config.gallery.port, config.gallery.host, () => {
    say(`gallery: ${lanUrls(config.gallery.port, token, config.gallery.host).join('  ')}`);
  });
  server.on('error', (e) => say(`gallery: ${e.message}`));
}

const shutdown = async (sig) => {
  say(`host: ${sig}, stopping`);
  server?.close();
  await host.stop();
  process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

if (opt.galleryOnly) {
  say('gallery only; the engineer loop is not running');
} else if (opt.once) {
  // One brief (the given one, else one standing brief), then stop; no further standing briefs.
  if (opt.genre) {
    await host.queueBrief({ brief_id: `cli-${opt.genre}-${Date.now().toString(36)}`, genre: opt.genre, count: Number(opt.count) || 3, notes: typeof opt.notes === 'string' ? opt.notes : undefined });
  } else {
    await host.poll();
    if (!host.state.deliveries.length) { host.state.tokens = Math.max(host.state.tokens, 1); await host.maybeStanding(); }
  }
  config.standing.enabled = false;
  const maxTicks = Number(opt.maxTicks) || 3600;
  let idle = 0;
  for (let t = 0; t < maxTicks; t++) {
    const did = await host.tick();
    const pending = host.state.jobs.length || host.state.deliveries.length;
    idle = did.delivered || did.job || pending ? 0 : idle + 1;
    if (idle >= 2) break;
    await new Promise((r) => setTimeout(r, did.delivered || did.job ? 50 : 1000)); // waiting on the rate limit: 1 s ticks
  }
  say(`once: ${JSON.stringify(host.state.counters)}; data in ${PATHS.data}`);
  await host.stop();
  process.exit(0);
} else {
  await host.run();
}
