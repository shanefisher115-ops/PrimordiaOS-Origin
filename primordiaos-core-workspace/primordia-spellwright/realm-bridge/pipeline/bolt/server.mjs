#!/usr/bin/env node
// Bolt pipeline server.
//   REST    http://127.0.0.1:7778   POST /jobs, GET /jobs, GET /jobs/:id, POST /jobs/:id/cancel,
//                                   GET /health, GET /workers, POST /events
//   Events  ws://127.0.0.1:7780/events   job.created, job.updated, job.log, spell.cast, build.*, worker.*
//
// Environment: BOLT_HOST, BOLT_PORT, BOLT_EVENTS_PORT, BOLT_KEY, BOLT_DATA, BOLT_SPOOL,
// BOLT_ALLOWLIST (file, or "none"), BLENDER_EXE ("none" to never launch), BLENDER_RPC_PORT,
// RESOLVE_PYTHON, AUTOBUILDER_URL, AUTOBUILDER_KEY.

import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRouter, HttpError, readJson } from '../lib/http.mjs';
import { JobStore, publicJob, TERMINAL } from '../lib/jobs.mjs';
import { attachWebSocketServer } from '../lib/websocket.mjs';
import {
  autobuilderWorker,
  blenderWorker,
  BlenderRpc,
  cadcamWorker,
  davinciWorker,
  Dispatcher,
  findBlender,
  spellWorker,
} from './workers.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const VERSION = '1.0.0';
export const DEFAULT_ALLOWLIST = resolve(HERE, '..', '..', 'unreal', 'PrimordiaCognition', 'Resources', 'Jules', 'bolt.allowlist.json');

export function configFromEnv(env = process.env) {
  const dataDir = resolve(env.BOLT_DATA || resolve(HERE, '..', 'data'));
  return {
    host: env.BOLT_HOST || '127.0.0.1',
    // 7778, not 7777: the realm-bridge node server owns 7777 and both run side by side.
    port: Number(env.BOLT_PORT ?? 7778),
    eventsPort: Number(env.BOLT_EVENTS_PORT ?? 7780),
    key: env.BOLT_KEY || '',
    dataDir,
    spoolDir: resolve(env.BOLT_SPOOL || resolve(dataDir, 'spool')),
    allowlistFile: env.BOLT_ALLOWLIST === 'none' ? null : env.BOLT_ALLOWLIST || DEFAULT_ALLOWLIST,
    blenderExe: env.BLENDER_EXE === 'none' ? null : env.BLENDER_EXE || findBlender(),
    blenderPort: Number(env.BLENDER_RPC_PORT ?? 7791),
    python: env.RESOLVE_PYTHON || 'python',
    autobuilderUrl: (env.AUTOBUILDER_URL || 'http://127.0.0.1:7790').replace(/\/$/, ''),
    autobuilderKey: env.AUTOBUILDER_KEY || '',
    persist: env.BOLT_PERSIST !== '0',
    quiet: env.BOLT_QUIET === '1',
  };
}

function loadAllowlist(file) {
  if (!file) return null;
  if (!existsSync(file)) throw new Error(`allow-list ${file} does not exist (set BOLT_ALLOWLIST=none to allow every kind)`);
  const data = JSON.parse(readFileSync(file, 'utf8').replace(/^﻿/, ''));
  if (!Array.isArray(data.allowed_tasks)) throw new Error(`${file} has no "allowed_tasks" array`);
  return data.allowed_tasks;
}

function listen(server, port, host, what) {
  return new Promise((res, rej) => {
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        const hint = port === 7777 ? ' (7777 belongs to the realm-bridge node server; Bolt defaults to 7778, so set BOLT_PORT=7778 and the same RestUrl in Project Settings > Plugins > PrimordiaOS Bolt Pipeline)' : '';
        rej(new Error(`${what} port ${port} is already in use${hint}`));
      } else {
        rej(err);
      }
    });
    server.listen(port, host, () => res(server.address().port));
  });
}

export async function startBolt(config = configFromEnv()) {
  const log = config.quiet ? () => {} : (...a) => console.log(new Date().toISOString(), '[bolt]', ...a);
  const store = new JobStore({ file: config.persist ? resolve(config.dataDir, 'jobs.json') : null });
  store.on('warning', (w) => log(w));
  const allowlist = loadAllowlist(config.allowlistFile);

  const authorized = (req) => !config.key || req.headers['x-bolt-key'] === config.key;

  // Event stream first, so workers can broadcast.
  const eventsHttp = createServer((req, res) => {
    res.writeHead(426, { 'Content-Type': 'text/plain' });
    res.end('Upgrade to WebSocket at /events\n');
  });
  const hub = attachWebSocketServer(eventsHttp, { path: '/events', authorize: authorized });
  const broadcast = (msg, topic) => hub.broadcast({ ...msg, at: new Date().toISOString() }, topic);
  hub.on('connection', (conn) => {
    conn.send(JSON.stringify({ type: 'hello', server: 'bolt', version: VERSION, at: new Date().toISOString() }));
    conn.on('message', (text) => {
      let msg;
      try {
        msg = JSON.parse(text);
      } catch {
        return;
      }
      if (msg.type === 'subscribe' && Array.isArray(msg.topics)) conn.topics = new Set(msg.topics.map(String));
      else if (msg.type === 'ping') conn.send(JSON.stringify({ type: 'pong', at: new Date().toISOString() }));
    });
  });

  const blender = new BlenderRpc({ port: config.blenderPort, exe: config.blenderExe, log });
  const dispatcher = new Dispatcher({
    store,
    allowlist,
    log,
    workers: [
      spellWorker({ dataDir: config.dataDir, broadcast }),
      cadcamWorker({ spoolDir: config.spoolDir }),
      blenderWorker({ rpc: blender }),
      davinciWorker({ dataDir: config.dataDir, python: config.python }),
      autobuilderWorker({ url: config.autobuilderUrl, key: config.autobuilderKey }),
    ],
  });

  store.on('created', (job) => broadcast({ type: 'job.created', job: publicJob(job) }, 'job'));
  store.on('updated', (job) => broadcast({ type: 'job.updated', job: publicJob(job) }, 'job'));
  store.on('log', (job, line) => broadcast({ type: 'job.log', jobId: job.id, line: String(line) }, 'job'));
  store.on('updated', (job) => {
    if (TERMINAL.has(job.status) && job.kind !== 'spell.cast') log(`${job.id} ${job.kind} ${job.status}${job.error ? `: ${job.error}` : ''}`);
  });

  const started = Date.now();
  const routes = [
    ['GET', '/health', async () => ({
      ok: true,
      server: 'bolt',
      version: VERSION,
      uptimeSeconds: Math.round((Date.now() - started) / 1000),
      jobs: { queued: store.list({ status: 'queued', limit: 1e6 }).length, running: store.list({ status: 'running', limit: 1e6 }).length },
      eventClients: hub.clients.size,
      eventsPort: config.eventsPort,
      allowlist: allowlist ?? 'any',
    })],
    ['GET', '/workers', async () => ({ workers: await dispatcher.status() })],
    ['GET', '/jobs', async (req, res, p, url) => ({
      jobs: store.list({ status: url.searchParams.get('status') || undefined, kind: url.searchParams.get('kind') || undefined, limit: Number(url.searchParams.get('limit') || 100) }).map((j) => publicJob(j)),
    })],
    ['GET', '/jobs/:id', async (req, res, { id }, url) => {
      const job = store.get(id);
      if (!job) throw new HttpError(404, `no job ${id}`);
      return { job: publicJob(job, { withPayload: url.searchParams.get('payload') === '1', withLog: true }) };
    }],
    ['POST', '/jobs', async (req, res) => {
      const body = await readJson(req);
      if (!dispatcher.isAllowed(String(body.kind || ''))) throw new HttpError(403, `task kind '${body.kind}' is not in the allow-list`);
      if (!dispatcher.workerFor(String(body.kind || ''))) throw new HttpError(400, `no worker handles '${body.kind}'`);
      let created;
      try {
        created = store.create({ id: body.id, kind: body.kind, payload: body.payload ?? {}, spellId: body.spellId, source: body.source || 'api' });
      } catch (err) {
        throw new HttpError(400, err.message);
      }
      res.statusCode = created.created ? 201 : 200;
      return { job: publicJob(created.job) };
    }],
    ['POST', '/jobs/:id/cancel', async (req, res, { id }) => {
      const job = dispatcher.cancel(id);
      if (!job) throw new HttpError(404, `no job ${id}`);
      return { job: publicJob(job) };
    }],
    ['POST', '/events', async (req) => {
      const body = await readJson(req);
      if (typeof body.type !== 'string' || !/^[a-z]+(\.[a-z_]+)+$/.test(body.type) || body.type.startsWith('job.')) {
        throw new HttpError(400, 'type must look like "build.started" and must not be a job event');
      }
      broadcast(body, body.type.split('.')[0]);
      return { ok: true, delivered: hub.clients.size };
    }],
  ];
  const rest = createServer(createRouter(routes, { authorize: authorized, log }));
  // WebSocket clients aimed at this port (the realm-bridge plugin defaults to ws://...:7777) get a
  // clear refusal instead of being parsed as REST calls.
  rest.on('upgrade', (req, socket) => {
    socket.on('error', () => socket.destroy());
    socket.end('HTTP/1.1 400 Bad Request\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\n' +
      `This is the Bolt REST API. Bolt events are on ws://${config.host}:${config.eventsPort}/events\n`);
  });

  const port = await listen(rest, config.port, config.host, 'Bolt REST');
  let eventsPort;
  try {
    eventsPort = await listen(eventsHttp, config.eventsPort, config.host, 'Bolt events');
  } catch (err) {
    rest.close();
    throw err;
  }
  log(`REST on http://${config.host}:${port}  events on ws://${config.host}:${eventsPort}/events`);
  log(`allow-list: ${allowlist ? allowlist.join(', ') : 'any kind'}; spool ${config.spoolDir}; Blender ${config.blenderExe || 'not managed'}`);

  return {
    port,
    eventsPort,
    store,
    dispatcher,
    broadcast,
    async close() {
      hub.close();
      blender.stop();
      store.flush();
      await Promise.all([new Promise((r) => rest.close(r)), new Promise((r) => eventsHttp.close(r))]);
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startBolt().then(
    (bolt) => {
      const stop = async () => {
        await bolt.close();
        process.exit(0);
      };
      process.on('SIGINT', stop);
      process.on('SIGTERM', stop);
    },
    (err) => {
      console.error(`[bolt] ${err.message}`);
      process.exit(1);
    },
  );
}
