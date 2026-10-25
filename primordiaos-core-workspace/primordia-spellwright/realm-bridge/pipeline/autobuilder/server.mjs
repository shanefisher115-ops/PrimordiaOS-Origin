#!/usr/bin/env node
// PrimordiaOS Autobuilder: builds and deploys the Unreal modules on request.
//   POST /build   {mode: "project"|"plugin", project?, plugin?, target?, configuration?, reason}
//   POST /deploy  {project?, reason}
//   GET  /status  current build, queue, recent builds
//   GET  /builds/:id   one build with its log tail
//
// Builds run one at a time through the PowerShell scripts in ../scripts. Each build publishes
// build.queued / build.started / build.finished to Bolt (POST /events) when Bolt is up.
//
// Environment: AUTOBUILDER_HOST, AUTOBUILDER_PORT (7790), AUTOBUILDER_KEY, UE_ENGINE_ROOT,
// UE_PROJECT, PRIMORDIA_PLUGIN_SOURCE, BOLT_URL, BOLT_KEY, AUTOBUILDER_POWERSHELL,
// AUTOBUILDER_SCRIPTS (a folder with replacement scripts, for tests).

import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRouter, fetchJson, HttpError, readJson } from '../lib/http.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const VERSION = '1.0.0';

export function configFromEnv(env = process.env) {
  return {
    host: env.AUTOBUILDER_HOST || '127.0.0.1',
    port: Number(env.AUTOBUILDER_PORT ?? 7790),
    key: env.AUTOBUILDER_KEY || '',
    engineRoot: env.UE_ENGINE_ROOT || 'C:\\Program Files\\Epic Games\\UE_5.4',
    project: env.UE_PROJECT || 'C:\\Users\\Shane\\Documents\\Unreal Projects\\PrimordiaRealms\\PrimordiaRealms.uproject',
    pluginSource: resolve(env.PRIMORDIA_PLUGIN_SOURCE || resolve(HERE, '..', '..', 'unreal', 'PrimordiaCognition')),
    scriptsDir: resolve(env.AUTOBUILDER_SCRIPTS || resolve(HERE, '..', 'scripts')),
    powershell: env.AUTOBUILDER_POWERSHELL || detectPowerShell(),
    boltUrl: (env.BOLT_URL || 'http://127.0.0.1:7778').replace(/\/$/, ''),
    boltKey: env.BOLT_KEY || '',
    quiet: env.AUTOBUILDER_QUIET === '1',
    keep: 50,
  };
}

function detectPowerShell() {
  for (const exe of ['pwsh', 'powershell']) {
    const r = spawnSync(exe, ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.Major'], { encoding: 'utf8', windowsHide: true });
    if (r.status === 0) return exe;
  }
  return 'powershell';
}

/** The last "PRIMORDIA_RESULT {json}" line a script printed, if any. */
export function parseResultLine(lines) {
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = /PRIMORDIA_RESULT\s+(\{.*\})\s*$/.exec(lines[i]);
    if (m) {
      try {
        return JSON.parse(m[1]);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export async function startAutobuilder(config = configFromEnv()) {
  const log = config.quiet ? () => {} : (...a) => console.log(new Date().toISOString(), '[autobuilder]', ...a);
  const builds = new Map();
  const queue = [];
  let current = null;

  const publish = (type, build) => {
    const headers = config.boltKey ? { 'X-Bolt-Key': config.boltKey } : {};
    fetchJson(`${config.boltUrl}/events`, { method: 'POST', body: { type, build: summary(build) }, headers, timeoutMs: 2000 }).catch(() => {});
  };

  const summary = (b) => ({
    id: b.id,
    action: b.action,
    mode: b.mode,
    status: b.status,
    reason: b.reason,
    source: b.source,
    queuedAt: b.queuedAt,
    startedAt: b.startedAt,
    finishedAt: b.finishedAt,
    seconds: b.seconds,
    exitCode: b.exitCode,
    summary: b.summary,
    error: b.error,
  });

  function scriptArgs(build) {
    const s = (name) => resolve(config.scriptsDir, name);
    const common = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File'];
    if (build.action === 'deploy') {
      return [...common, s('Install-PrimordiaModules.ps1'), '-Source', config.pluginSource, '-ProjectPath', build.project];
    }
    const args = [...common, s('Build-PrimordiaModules.ps1'), '-Mode', build.mode === 'plugin' ? 'Plugin' : 'Project',
      '-EngineRoot', config.engineRoot, '-ProjectPath', build.project, '-PluginPath', build.plugin, '-Configuration', build.configuration];
    if (build.target) args.push('-Target', build.target);
    return args;
  }

  function pump() {
    if (current || queue.length === 0) return;
    const build = builds.get(queue.shift());
    if (!build || build.status !== 'queued') return pump();
    current = build;
    build.status = 'running';
    build.startedAt = new Date().toISOString();
    log(`${build.action} ${build.id} (${build.mode}) started: ${build.reason}`);
    publish('build.started', build);

    const child = spawn(config.powershell, scriptArgs(build), { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    build.pid = child.pid;
    const onData = (d) => {
      for (const line of String(d).split(/\r?\n/)) {
        if (!line.trim()) continue;
        build.log.push(line);
        if (build.log.length > 400) build.log.splice(0, build.log.length - 400);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    const finish = (code, err) => {
      build.exitCode = code;
      build.finishedAt = new Date().toISOString();
      build.seconds = Math.round((Date.parse(build.finishedAt) - Date.parse(build.startedAt)) / 100) / 10;
      const result = parseResultLine(build.log);
      build.summary = result?.summary || (code === 0 ? 'ok' : build.log.filter((l) => /error/i.test(l)).slice(-3).join(' | ') || `exit code ${code}`);
      build.result = result;
      build.status = code === 0 && !err ? 'succeeded' : 'failed';
      if (err) build.error = err;
      log(`${build.action} ${build.id} ${build.status} in ${build.seconds} s: ${build.summary}`);
      publish('build.finished', build);
      current = null;
      prune();
      pump();
    };
    child.on('error', (e) => finish(-1, `cannot start ${config.powershell}: ${e.message}`));
    child.on('close', (code) => {
      if (current === build) finish(code ?? -1);
    });
  }

  function prune() {
    const done = [...builds.values()].filter((b) => b.status === 'succeeded' || b.status === 'failed');
    done.sort((a, b) => (a.finishedAt < b.finishedAt ? -1 : 1));
    for (const b of done.slice(0, Math.max(0, done.length - config.keep))) builds.delete(b.id);
  }

  function enqueue(action, body) {
    const reason = String(body.reason || '').trim();
    if (!reason) throw new HttpError(400, 'a reason is required (Covenant of the Lattice Wardens)');
    const project = body.project || config.project;
    if (!/\.uproject$/i.test(project)) throw new HttpError(400, `project must be a .uproject path, got '${project}'`);
    const mode = action === 'deploy' ? 'deploy' : String(body.mode || 'project').toLowerCase();
    if (!['project', 'plugin', 'deploy'].includes(mode)) throw new HttpError(400, `mode must be project or plugin, got '${body.mode}'`);
    const configuration = String(body.configuration || 'Development');
    if (!['Debug', 'DebugGame', 'Development', 'Shipping', 'Test'].includes(configuration)) throw new HttpError(400, `bad configuration '${configuration}'`);
    if (body.target && !/^[A-Za-z0-9_]+$/.test(body.target)) throw new HttpError(400, 'target must be a target name');

    // The same request already waiting is the same build.
    const waiting = queue.map((id) => builds.get(id)).find((b) => b && b.action === action && b.mode === mode && b.project === project);
    if (waiting) return { build: summary(waiting), duplicate: true };

    const build = {
      id: `build-${randomUUID().slice(0, 8)}`,
      action,
      mode,
      project,
      plugin: body.plugin || resolve(config.pluginSource, 'PrimordiaCognition.uplugin'),
      target: body.target || '',
      configuration,
      reason,
      source: body.source || 'api',
      status: 'queued',
      queuedAt: new Date().toISOString(),
      log: [],
    };
    builds.set(build.id, build);
    queue.push(build.id);
    publish('build.queued', build);
    setImmediate(pump);
    return { build: summary(build) };
  }

  const authorize = (req) => !config.key || req.headers['x-autobuilder-key'] === config.key;
  const started = Date.now();
  const routes = [
    ['GET', '/status', async () => ({
      ok: true,
      server: 'autobuilder',
      version: VERSION,
      uptimeSeconds: Math.round((Date.now() - started) / 1000),
      busy: !!current,
      current: current ? { ...summary(current), logTail: current.log.slice(-20) } : null,
      queue: queue.map((id) => summary(builds.get(id))),
      recent: [...builds.values()].filter((b) => b.finishedAt).sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : -1)).slice(0, 10).map(summary),
      engineRoot: config.engineRoot,
      engineFound: existsSync(config.engineRoot),
      project: config.project,
      pluginSource: config.pluginSource,
    })],
    ['GET', '/builds/:id', async (req, res, { id }) => {
      const b = builds.get(id);
      if (!b) throw new HttpError(404, `no build ${id}`);
      return { build: { ...summary(b), result: b.result ?? null, log: b.log.slice(-200) } };
    }],
    ['POST', '/build', async (req, res) => {
      const out = enqueue('build', await readJson(req));
      res.statusCode = out.duplicate ? 200 : 202;
      return out;
    }],
    ['POST', '/deploy', async (req, res) => {
      const out = enqueue('deploy', await readJson(req));
      res.statusCode = out.duplicate ? 200 : 202;
      return out;
    }],
  ];
  const server = createServer(createRouter(routes, { authorize, log }));
  const port = await new Promise((res, rej) => {
    server.once('error', (e) => rej(e.code === 'EADDRINUSE' ? new Error(`Autobuilder port ${config.port} is already in use`) : e));
    server.listen(config.port, config.host, () => res(server.address().port));
  });
  log(`listening on http://${config.host}:${port} (PowerShell: ${config.powershell}; scripts: ${config.scriptsDir})`);
  return {
    port,
    builds,
    close: () => new Promise((r) => server.close(r)),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startAutobuilder().then(
    (a) => {
      const stop = async () => {
        await a.close();
        process.exit(0);
      };
      process.on('SIGINT', stop);
      process.on('SIGTERM', stop);
    },
    (err) => {
      console.error(`[autobuilder] ${err.message}`);
      process.exit(1);
    },
  );
}
