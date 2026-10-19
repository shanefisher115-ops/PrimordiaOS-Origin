// Folder (dev) and Docker (local) realm adapter: state lives in the container's files.
// v1.2: inbox/outbox reads and writes happen under <agent>/inbox/.lock (the same lock the kernel's
// dev dispatcher takes), but agent code — including model calls via advise() — runs outside it.
import { readFile, writeFile, mkdir, rename, rm, stat, utimes } from 'node:fs/promises';
import { appendFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { runLoop, createKernelAdvisor } from './core.js';

export const FILES = {
  memory: 'state/memory.json',
  context: 'state/context.json',
  inbox: 'inbox/events.json',
  outbox: 'outbox/actions.json',
};

const LOCK_STALE_MS = 15000;
const LOCK_WAIT_MS = 20000;

// Two locks:
//   inbox/.lock  short: held only while reading or rewriting inbox/outbox/state (kernel takes this one too)
//   state/.run.lock  long: held for a whole loop so two loops never process the same inbox
// Held locks are touched every 5 s, so a long model call never makes a live lock look stale.
const LOCKS = { inbox: ['inbox', '.lock'], run: ['state', '.run.lock'] };

export async function withFolderLock(root, fn, which = 'inbox') {
  const lock = path.join(root, ...LOCKS[which]);
  const deadline = Date.now() + (which === 'run' ? 5 * 60000 : LOCK_WAIT_MS);
  for (;;) {
    try { await writeFile(lock, `agent:${process.pid}`, { flag: 'wx' }); break; } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try { if (Date.now() - (await stat(lock)).mtimeMs > LOCK_STALE_MS) { await rm(lock, { force: true }); continue; } } catch { continue; }
      if (Date.now() > deadline) throw new Error(`lock timeout on ${lock}`);
      await new Promise((r) => setTimeout(r, 25));
    }
  }
  const heartbeat = setInterval(() => { const t = new Date(); utimes(lock, t, t).catch(() => {}); }, 5000);
  heartbeat.unref?.();
  try { return await fn(); } finally { clearInterval(heartbeat); await rm(lock, { force: true }); }
}

export function folderIO(root, manifest, realm, { quiet = false } = {}) {
  const logFile = path.join(root, 'logs/runtime.log');
  return {
    withLock: (fn) => withFolderLock(root, fn, 'inbox'),
    async read(key, fallback) {
      try { return JSON.parse(await readFile(path.join(root, FILES[key]), 'utf8')); } catch { return fallback; }
    },
    async write(key, value) {
      const file = path.join(root, FILES[key]);
      const tmp = `${file}.${process.pid}.tmp`;
      await writeFile(tmp, JSON.stringify(value, null, 2) + '\n');
      await rename(tmp, file);
    },
    log(line) {
      const entry = `${new Date().toISOString()} [${manifest.name}@${realm}] ${line}\n`;
      if (!quiet) process.stdout.write(entry);
      appendFileSync(logFile, entry);
    },
  };
}

export async function loadManifest(root) {
  return JSON.parse(await readFile(path.join(root, 'agent.json'), 'utf8'));
}

// `agentModule` is passed in when agent.js runs itself (avoids a circular self-import);
// other callers (http.js, kernel, simulation) can omit it and the entry file is imported.
export async function runFolderLoop(rootUrl, agentModule, opts = {}) {
  const root = rootUrl instanceof URL ? fileURLToPath(rootUrl) : rootUrl;
  const manifest = await loadManifest(root);
  const realm = process.env.PRIMORDIA_REALM || manifest.realm || 'dev';
  await mkdir(path.join(root, 'logs'), { recursive: true });
  const agent = agentModule ?? await import(pathToFileURL(path.join(root, manifest.entry)).href);
  // Model guidance is opt-in: set PRIMORDIA_KERNEL (and PRIMORDIA_TOKEN) to let decide() call advise().
  const advise = createKernelAdvisor(process.env.PRIMORDIA_KERNEL, process.env.PRIMORDIA_TOKEN, manifest.name);
  return withFolderLock(root, () => runLoop(agent, manifest, folderIO(root, manifest, realm, opts), realm, { advise }), 'run');
}
