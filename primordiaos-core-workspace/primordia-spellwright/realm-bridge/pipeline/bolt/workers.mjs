// Bolt workers: each takes jobs of some kinds and turns them into results.
//   spell.cast         record the spell (telemetry) and broadcast it
//   cadcam.fabricate   check and spool G-code for the machine's sender
//   blender.*          drive Blender through workers/blender_rpc_server.py (started on demand)
//   davinci.*          run workers/resolve_worker.py against a running DaVinci Resolve
//   autobuilder.*      hand builds to the Autobuilder server and follow them

import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchJson, wildcardMatch } from '../lib/http.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const WORKERS_DIR = resolve(HERE, '..', 'workers');

const sleep = (ms, signal) =>
  new Promise((res, rej) => {
    const t = setTimeout(res, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      rej(new Error('cancelled'));
    }, { once: true });
  });

/** Newest Blender under Program Files, or null. */
export function findBlender() {
  const root = 'C:\\Program Files\\Blender Foundation';
  if (process.platform !== 'win32' || !existsSync(root)) return null;
  const versions = readdirSync(root)
    .filter((d) => existsSync(join(root, d, 'blender.exe')))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return versions.length ? join(root, versions.at(-1), 'blender.exe') : null;
}

function safeName(name, fallback) {
  const s = String(name || '').replace(/[^A-Za-z0-9._-]/g, '_').replace(/^\.+/, '');
  return s || fallback;
}

// ---------------------------------------------------------------- spell.cast

export function spellWorker({ dataDir, broadcast }) {
  const file = join(dataDir, 'spells.jsonl');
  return {
    name: 'spell',
    kinds: ['spell.cast'],
    concurrency: 8,
    async run(job) {
      const { schema, spell } = job.payload;
      if (schema !== 'primordia.spell/1' || !spell || typeof spell !== 'object') {
        throw new Error('payload is not a primordia.spell/1 envelope');
      }
      const steps = Array.isArray(spell.steps) ? spell.steps : [];
      mkdirSync(dataDir, { recursive: true });
      appendFileSync(file, JSON.stringify({ at: new Date().toISOString(), jobId: job.id, spell }) + '\n');
      broadcast({
        type: 'spell.cast',
        spell: { id: spell.id, name: spell.name, school: spell.school, realm: spell.realm, provenance: spell.provenance, steps: steps.map((s) => s.op) },
      }, 'spell');
      return { recorded: true, steps: steps.length, log: file };
    },
  };
}

// ---------------------------------------------------------------- cadcam

/** Basic structural checks on a program before it goes anywhere near a machine. */
export function checkGCode(text) {
  const problems = [];
  const lines = text.split(/\r?\n/);
  const upper = text.toUpperCase();
  if (!/\bG21\b/.test(upper)) problems.push('no G21 (millimetres)');
  if (!/\bG90\b/.test(upper)) problems.push('no G90 (absolute)');
  if (!/\bM0?3\b/.test(upper)) problems.push('spindle never starts (M3)');
  if (!/\bM30\b|\bM0?2\b/.test(upper)) problems.push('no program end (M30/M2)');
  if (/\bG0?[23]\b/.test(upper.replace(/\([^)]*\)/g, ''))) problems.push('contains arcs, which the PrimordiaOS simulator did not verify');
  return { lines: lines.length, problems };
}

export function cadcamWorker({ spoolDir }) {
  return {
    name: 'cadcam',
    kinds: ['cadcam.fabricate'],
    concurrency: 2,
    async run(job, ctx) {
      const { gcode, gcodeFile, name, simulation } = job.payload;
      if (typeof gcode !== 'string' || gcode.length < 10) throw new Error('payload.gcode is missing');
      if (simulation && simulation.ok === false) throw new Error('the job failed simulation in Unreal; refusing to spool it');
      const check = checkGCode(gcode);
      if (check.problems.length) throw new Error(`G-code rejected: ${check.problems.join('; ')}`);
      mkdirSync(spoolDir, { recursive: true });
      let file = safeName(gcodeFile || `${name || 'part'}.nc`, 'part.nc');
      if (!/\.(nc|gcode|ngc|tap)$/i.test(file)) file += '.nc';
      let target = join(spoolDir, file);
      for (let n = 2; existsSync(target); n++) target = join(spoolDir, file.replace(/(\.[^.]+)$/, `_${n}$1`));
      writeFileSync(target, gcode);
      ctx.log(`spooled ${check.lines} lines to ${target}`);
      return {
        spoolPath: target,
        bytes: Buffer.byteLength(gcode),
        lines: check.lines,
        machiningSeconds: simulation?.machiningSeconds ?? null,
      };
    },
  };
}

// ---------------------------------------------------------------- blender

export class BlenderRpc {
  constructor({ port = 7791, exe = null, log = () => {} } = {}) {
    this.url = `http://127.0.0.1:${port}/rpc`;
    this.port = port;
    this.exe = exe;
    this.log = log;
    this.child = null;
    this.nextId = 1;
    this.starting = null;
  }

  async call(method, params = {}, timeoutMs = 30000) {
    const { json, status } = await fetchJson(this.url, {
      method: 'POST',
      body: { jsonrpc: '2.0', id: this.nextId++, method, params },
      timeoutMs,
    });
    if (!json) throw new Error(`Blender RPC HTTP ${status} with no body`);
    if (json.error) throw new Error(json.error.message || 'Blender error');
    return json.result ?? {};
  }

  async ping() {
    try {
      return await this.call('ping', {}, 3000);
    } catch {
      return null;
    }
  }

  /** Makes sure a Blender RPC server is answering, launching one headless if allowed. */
  async ensure() {
    if (await this.ping()) return;
    if (!this.exe) throw new Error('Blender RPC server is not running and no Blender executable is configured (BLENDER_EXE)');
    if (this.child && !this.starting) {
      // Our Blender is alive but not answering yet (still loading): wait for it rather than start another.
      for (let i = 0; i < 60 && this.child; i++) {
        if (await this.ping()) return;
        await sleep(500);
      }
      if (this.child) throw new Error('the managed Blender process is not answering');
    }
    if (!this.starting) {
      this.starting = (async () => {
        const script = join(WORKERS_DIR, 'blender_rpc_server.py');
        this.log(`starting Blender: ${this.exe}`);
        this.child = spawn(this.exe, ['-b', '--factory-startup', '--python', script, '--', '--port', String(this.port), '--empty'], {
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        });
        this.child.stdout.on('data', (d) => this.log(`[blender] ${String(d).trimEnd()}`));
        this.child.stderr.on('data', (d) => this.log(`[blender] ${String(d).trimEnd()}`));
        this.child.on('exit', (code) => {
          this.log(`Blender exited (${code})`);
          this.child = null;
        });
        const deadline = Date.now() + 90000;
        while (Date.now() < deadline) {
          if (await this.ping()) return;
          if (!this.child) throw new Error('Blender exited before its RPC server came up');
          await sleep(500);
        }
        throw new Error('Blender did not start its RPC server within 90 s');
      })().finally(() => {
        this.starting = null;
      });
    }
    await this.starting;
  }

  stop() {
    if (this.child) this.child.kill();
  }
}

const LONG_BLENDER_METHODS = new Set(['render', 'animate', 'import', 'export']);

export function blenderWorker({ rpc }) {
  return {
    name: 'blender',
    kinds: ['blender.*'],
    concurrency: 1, // one Blender session, one scene
    async status() {
      const info = await rpc.ping();
      return { online: !!info, blender: info?.blender || null, managed: !!rpc.child };
    },
    async run(job, ctx) {
      const { method, params = {} } = job.payload;
      if (typeof method !== 'string' || !method) throw new Error('payload.method is missing');
      await rpc.ensure();
      if (!LONG_BLENDER_METHODS.has(method)) return rpc.call(method, params);
      const { task } = await rpc.call(method, { ...params, async: true });
      if (!task) throw new Error('Blender did not start a task');
      for (;;) {
        await sleep(1000, ctx.signal);
        let st;
        try {
          st = await rpc.call('task.status', { task }, 10000);
        } catch (err) {
          // A render can keep Blender's main thread busy past a poll; try again.
          ctx.log(`poll: ${err.message}`);
          continue;
        }
        ctx.progress(st.progress ?? 0, st.message || st.state);
        if (st.state === 'done') return st.result ?? {};
        if (st.state === 'failed') throw new Error(st.error || 'Blender task failed');
      }
    },
  };
}

// ---------------------------------------------------------------- davinci

export function resolveEnv() {
  const env = { ...process.env };
  if (process.platform === 'win32') {
    env.RESOLVE_SCRIPT_API ||= join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'Blackmagic Design', 'DaVinci Resolve', 'Support', 'Developer', 'Scripting');
    env.RESOLVE_SCRIPT_LIB ||= 'C:\\Program Files\\Blackmagic Design\\DaVinci Resolve\\fusionscript.dll';
  } else if (process.platform === 'darwin') {
    env.RESOLVE_SCRIPT_API ||= '/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting';
    env.RESOLVE_SCRIPT_LIB ||= '/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so';
  } else {
    env.RESOLVE_SCRIPT_API ||= '/opt/resolve/Developer/Scripting';
    env.RESOLVE_SCRIPT_LIB ||= '/opt/resolve/libs/Fusion/fusionscript.so';
  }
  const modules = join(env.RESOLVE_SCRIPT_API, 'Modules');
  env.PYTHONPATH = env.PYTHONPATH ? `${env.PYTHONPATH}${process.platform === 'win32' ? ';' : ':'}${modules}` : modules;
  return env;
}

/** Runs a Python worker that prints JSON lines; resolves with its {"result"} or rejects with its {"error"}. */
export function runJsonLinesProcess(command, args, { env, signal, onLine = () => {}, onProgress = () => {} }) {
  return new Promise((resolveP, reject) => {
    const child = spawn(command, args, { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let result = null;
    let error = null;
    let buffer = '';
    const stderr = [];
    const abort = () => child.kill();
    signal?.addEventListener('abort', abort, { once: true });
    child.stdout.on('data', (d) => {
      buffer += d;
      let nl;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          onLine(line);
          continue;
        }
        if (msg.result !== undefined) result = msg.result;
        else if (msg.error !== undefined) error = msg.error;
        else if (msg.progress !== undefined) onProgress(msg.progress, msg.message || '');
        if (msg.message) onLine(msg.message);
      }
    });
    child.stderr.on('data', (d) => stderr.push(String(d)));
    child.on('error', (err) => reject(new Error(`cannot start ${command}: ${err.message}`)));
    child.on('close', (code) => {
      signal?.removeEventListener('abort', abort);
      if (signal?.aborted) return reject(new Error('cancelled'));
      if (error) return reject(new Error(error));
      if (code === 0 && result !== null) return resolveP(result);
      reject(new Error(`worker exited ${code}: ${stderr.join('').trim().split(/\r?\n/).slice(-3).join(' | ') || 'no result'}`));
    });
  });
}

export function davinciWorker({ dataDir, python = 'python' }) {
  const jobsDir = join(dataDir, 'davinci');
  return {
    name: 'davinci',
    kinds: ['davinci.*'],
    concurrency: 1, // Resolve renders one queue at a time
    async run(job, ctx) {
      mkdirSync(jobsDir, { recursive: true });
      const file = join(jobsDir, `${safeName(job.id, 'job')}.json`);
      writeFileSync(file, JSON.stringify(job.payload, null, 1));
      return runJsonLinesProcess(python, ['-u', join(WORKERS_DIR, 'resolve_worker.py'), '--job', file], {
        env: resolveEnv(),
        signal: ctx.signal,
        onLine: (l) => ctx.log(l),
        onProgress: (p, m) => ctx.progress(p, m),
      });
    },
  };
}

// ---------------------------------------------------------------- autobuilder

export function autobuilderWorker({ url, key }) {
  const headers = key ? { 'X-Autobuilder-Key': key } : {};
  return {
    name: 'autobuilder',
    kinds: ['autobuilder.build', 'autobuilder.deploy'],
    concurrency: 1,
    async status() {
      try {
        const { ok, json } = await fetchJson(`${url}/status`, { headers, timeoutMs: 3000 });
        return { online: ok, busy: json?.busy ?? null };
      } catch {
        return { online: false };
      }
    },
    async run(job, ctx) {
      const action = job.kind === 'autobuilder.deploy' ? 'deploy' : 'build';
      const { status, json } = await fetchJson(`${url}/${action}`, { method: 'POST', body: { ...job.payload, source: 'bolt', boltJob: job.id }, headers });
      if (status >= 300 || !json?.build?.id) throw new Error(json?.error || `Autobuilder refused the ${action} (HTTP ${status})`);
      const id = json.build.id;
      ctx.log(`Autobuilder ${action} ${id} queued`);
      for (;;) {
        await sleep(2000, ctx.signal);
        const { json: b } = await fetchJson(`${url}/builds/${encodeURIComponent(id)}`, { headers });
        const build = b?.build;
        if (!build) throw new Error(`Autobuilder lost build ${id}`);
        ctx.progress(build.status === 'running' ? 0.5 : 0.1, build.status);
        if (build.status === 'succeeded') return { buildId: id, action, seconds: build.seconds, summary: build.summary || '' };
        if (build.status === 'failed') throw new Error(`${action} failed: ${build.summary || build.error || 'see the Autobuilder log'}`);
      }
    },
  };
}

// ---------------------------------------------------------------- dispatch

/**
 * Runs jobs through workers with per-worker concurrency, cancellation and an allow-list.
 */
export class Dispatcher {
  constructor({ store, workers, allowlist = null, log = () => {} }) {
    this.store = store;
    this.workers = workers;
    this.allowlist = allowlist; // null = everything
    this.log = log;
    this.queues = new Map(workers.map((w) => [w.name, []]));
    this.running = new Map(); // job id -> {worker, controller}
    this.active = new Map(workers.map((w) => [w.name, 0]));
    store.on('created', (job) => this.#enqueue(job));
  }

  workerFor(kind) {
    return this.workers.find((w) => w.kinds.some((k) => wildcardMatch(k, kind)));
  }

  isAllowed(kind) {
    return !this.allowlist || this.allowlist.some((p) => wildcardMatch(p, kind));
  }

  #enqueue(job) {
    if (job.status !== 'queued') return;
    const worker = this.workerFor(job.kind);
    if (!worker) {
      this.store.update(job.id, { status: 'failed', error: `no worker handles ${job.kind}` });
      return;
    }
    this.queues.get(worker.name).push(job.id);
    this.#pump(worker);
  }

  #pump(worker) {
    const queue = this.queues.get(worker.name);
    while (this.active.get(worker.name) < worker.concurrency && queue.length) {
      const id = queue.shift();
      const job = this.store.get(id);
      if (!job || job.status !== 'queued') continue;
      this.#start(worker, job);
    }
  }

  #start(worker, job) {
    const controller = new AbortController();
    this.active.set(worker.name, this.active.get(worker.name) + 1);
    this.running.set(job.id, { worker, controller });
    this.store.update(job.id, { status: 'running', message: `${worker.name} started` });
    const ctx = {
      signal: controller.signal,
      progress: (p, message) => this.store.update(job.id, { progress: Math.max(0, Math.min(1, Number(p) || 0)), ...(message ? { message } : {}) }),
      log: (line) => this.store.appendLog(job.id, line),
    };
    const started = Date.now();
    Promise.resolve()
      .then(() => worker.run(job, ctx))
      .then((result) => {
        if (controller.signal.aborted) return;
        this.store.update(job.id, { status: 'succeeded', result: result ?? {}, message: `done in ${((Date.now() - started) / 1000).toFixed(1)} s` });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        this.log(`job ${job.id} (${job.kind}) failed: ${err.message}`);
        this.store.update(job.id, { status: 'failed', error: err.message });
      })
      .finally(() => {
        this.running.delete(job.id);
        this.active.set(worker.name, this.active.get(worker.name) - 1);
        this.#pump(worker);
      });
  }

  cancel(id) {
    const job = this.store.get(id);
    if (!job) return null;
    const running = this.running.get(id);
    if (running) running.controller.abort();
    for (const q of this.queues.values()) {
      const i = q.indexOf(id);
      if (i >= 0) q.splice(i, 1);
    }
    return this.store.update(id, { status: 'cancelled', message: 'cancelled' });
  }

  async status() {
    const out = [];
    for (const w of this.workers) {
      out.push({
        name: w.name,
        kinds: w.kinds,
        concurrency: w.concurrency,
        running: this.active.get(w.name),
        queued: this.queues.get(w.name).length,
        ...(w.status ? await w.status().catch(() => ({})) : {}),
      });
    }
    return out;
  }
}

export function newestFile(dir, prefix) {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => !prefix || f.startsWith(prefix)).map((f) => join(dir, f));
  files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return files[0] ? basename(files[0]) : null;
}
