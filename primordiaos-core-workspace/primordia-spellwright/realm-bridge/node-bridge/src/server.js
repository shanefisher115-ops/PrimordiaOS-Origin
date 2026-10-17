#!/usr/bin/env node
// PrimordiaOS -> Unreal bridge. Serves PRS-1 packets on ws://127.0.0.1:7777.
//
//   node src/server.js [--port 7777] [--host 127.0.0.1] [--hz 60] [--seed 1234]
//                      [--modules ./my-modules] [--evolve 15] [--validate]
//
// Every option also reads PRIMORDIA_<NAME> from the environment.
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'node:url';
import { createMetaState } from './state.js';
import { loadModules } from './modules/index.js';
import { validatePacket } from './schemas.js';

export const VERSION = '1.0.0';
const MAX_BUFFERED_BYTES = 1 << 20; // above this a client is lagging: drop continuous frames
const ALWAYS_DELIVER = new Set(['realm_manifest', 'hello', 'ack', 'pong']);

export async function createBridge(options = {}) {
  const {
    port = 7777,
    host = '127.0.0.1',
    hz = 60,
    seed = 0x5eed1e55,
    modulesDir = null,
    evolveSeconds = 15,
    validate = false,
    log = console.log,
  } = options;
  const masterHz = Math.min(60, Math.max(30, hz));

  const ctx = { t: 0, state: createMetaState(), manifest: null, realmId: '' };
  log(`[bridge] PrimordiaOS realm bridge v${VERSION} seed=0x${(seed >>> 0).toString(16)} hz=${masterHz}`);
  const modules = await loadModules({ seed, modulesDir, evolveSeconds, log });
  for (const m of modules) m.init(ctx);

  const streams = Object.fromEntries(
    modules.filter((m) => m.stream).map((m) => [m.stream, Math.min(m.hz, masterHz)]),
  );
  const acc = new Map(modules.map((m) => [m, Infinity])); // Infinity => due on the first tick
  const stats = { ticks: 0, packets: 0, bytes: 0, dropped: 0, invalid: 0 };
  let seq = 0;

  const envelope = (p) => ({
    prs: 1,
    type: p.type,
    op: p.op ?? 'upsert',
    id: p.id,
    realm: ctx.realmId,
    seq: seq++,
    t: Math.round(ctx.t * 1000) / 1000,
    ts: Date.now(),
    payload: p.payload ?? {},
  });

  const encode = (p) => {
    const env = envelope(p);
    if (validate) {
      const errors = validatePacket(env);
      if (errors.length) {
        stats.invalid++;
        log(`[bridge] invalid ${env.type}/${env.id}: ${errors.slice(0, 5).join('; ')}`);
      }
    }
    return { env, text: JSON.stringify(env) };
  };

  const wss = new WebSocketServer({ port, host, perMessageDeflate: false });
  const clients = new Set();

  function deliver(client, { env, text }) {
    const ws = client.ws;
    if (ws.readyState !== ws.OPEN) return;
    if (client.streams && !client.streams.has(env.type) && !ALWAYS_DELIVER.has(env.type)) return;
    const critical = ALWAYS_DELIVER.has(env.type) || env.op === 'retire';
    if (!critical) {
      if (ws.bufferedAmount > MAX_BUFFERED_BYTES) {
        stats.dropped++;
        return;
      }
      // Per-client rate cap (set_rate), keyed per entity so streams don't starve each other.
      // Only engaged below the master rate: OS timer jitter would otherwise drop frames.
      if (client.hz < masterHz) {
        const key = `${env.type}\u0000${env.id}`;
        const last = client.lastSent.get(key) ?? -Infinity;
        if (env.ts - last < 1000 / client.hz - 1) return;
        client.lastSent.set(key, env.ts);
      }
    }
    ws.send(text);
    stats.packets++;
    stats.bytes += text.length;
  }

  function sendFullState(client) {
    for (const m of modules) {
      for (const p of m.sample(ctx, { full: true })) deliver(client, encode(p));
    }
  }

  const reply = (client, type, payload) => deliver(client, encode({ type, id: 'bridge', payload }));

  function handleCommand(client, msg) {
    const worldforge = modules.find((m) => m.key === 'worldforge');
    const { name, args = {} } = msg;
    switch (name) {
      case 'evolve_realm':
        worldforge.forceEvolve?.();
        break;
      case 'reseed':
        worldforge.reseed?.(ctx, Number(args.seed) >>> 0);
        break;
      case 'perturb': {
        // e.g. {name:"perturb", args:{key:"entropy", value:0.9}}
        if (!(args.key in ctx.state) || typeof args.value !== 'number') throw new Error(`cannot perturb ${args.key}`);
        ctx.state[args.key] = args.value;
        break;
      }
      case 'load_manifest':
        worldforge.loadManifest?.(ctx, args.manifest);
        break;
      default:
        throw new Error(`unknown command ${name}`);
    }
  }

  function onMessage(client, raw) {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return reply(client, 'ack', { command: '?', ok: false, error: 'malformed JSON' });
    }
    switch (msg.type) {
      case 'hello':
        client.name = msg.client ?? client.name;
        if (Array.isArray(msg.streams) && msg.streams.length) client.streams = new Set(msg.streams);
        if (typeof msg.hz === 'number') client.hz = Math.min(60, Math.max(1, msg.hz));
        log(`[bridge] ${client.name} says hello (hz=${client.hz}, streams=${client.streams ? [...client.streams].join(',') : 'all'})`);
        return;
      case 'subscribe':
        client.streams = Array.isArray(msg.streams) && msg.streams.length ? new Set(msg.streams) : null;
        return;
      case 'set_rate':
        client.hz = Math.min(60, Math.max(1, Number(msg.hz) || masterHz));
        return;
      case 'request_manifest':
        return sendFullState(client);
      case 'ping':
        return reply(client, 'pong', { nonce: msg.nonce ?? null });
      case 'command':
        try {
          handleCommand(client, msg);
          return reply(client, 'ack', { command: msg.name, ok: true });
        } catch (err) {
          return reply(client, 'ack', { command: msg.name, ok: false, error: err.message });
        }
      default:
        return reply(client, 'ack', { command: String(msg.type), ok: false, error: 'unknown message type' });
    }
  }

  wss.on('connection', (ws, req) => {
    const client = { ws, name: req.socket.remoteAddress, hz: masterHz, streams: null, lastSent: new Map() };
    clients.add(client);
    log(`[bridge] client connected (${clients.size} total)`);
    ws.on('message', (raw) => onMessage(client, raw));
    ws.on('close', () => {
      clients.delete(client);
      log(`[bridge] ${client.name} disconnected (${clients.size} total)`);
    });
    ws.on('error', (err) => log(`[bridge] socket error: ${err.message}`));
    reply(client, 'hello', {
      server: 'PrimordiaOS',
      version: VERSION,
      streams,
      units: { length: 'meter', up: '+Z', handedness: 'left', color: 'linear' },
    });
    sendFullState(client);
  });

  // Master loop: drift-corrected timer. Every module steps every tick; a
  // module samples when its own stream period has elapsed.
  const period = 1000 / masterHz;
  let last = performance.now();
  let nextAt = last + period;
  let timer = null;
  let running = true;

  function tick() {
    if (!running) return;
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    stats.ticks++;
    for (const m of modules) m.step(dt, ctx);
    for (const m of modules) {
      if (!m.stream) continue;
      const elapsed = acc.get(m) + dt;
      const streamPeriod = 1 / Math.min(m.hz, masterHz);
      if (elapsed < streamPeriod) {
        acc.set(m, elapsed);
        continue;
      }
      acc.set(m, Number.isFinite(elapsed) ? elapsed % streamPeriod : 0);
      if (!clients.size) continue;
      for (const p of m.sample(ctx)) {
        const encoded = encode(p);
        for (const c of clients) deliver(c, encoded);
      }
    }
    nextAt += period;
    if (nextAt < now) nextAt = now + period; // fell behind (debugger, sleep): don't spiral
    timer = setTimeout(tick, Math.max(0, nextAt - performance.now()));
  }

  await new Promise((res, rej) => {
    wss.once('listening', res);
    wss.once('error', rej);
  });
  log(`[bridge] listening on ws://${host}:${wss.address().port}  realm=${ctx.manifest.realm_name} (${ctx.realmId})`);
  timer = setTimeout(tick, period);

  return {
    wss,
    ctx,
    modules,
    stats,
    get port() {
      return wss.address().port;
    },
    async close() {
      running = false;
      clearTimeout(timer);
      for (const c of clients) c.ws.terminate();
      await new Promise((res) => wss.close(res));
    },
  };
}

function parseArgs(argv) {
  const env = process.env;
  const get = (flag, envName, fallback) => {
    const i = argv.indexOf(flag);
    if (i >= 0 && argv[i + 1] !== undefined) return argv[i + 1];
    return env[envName] ?? fallback;
  };
  return {
    port: Number(get('--port', 'PRIMORDIA_PORT', 7777)),
    host: get('--host', 'PRIMORDIA_HOST', '127.0.0.1'),
    hz: Number(get('--hz', 'PRIMORDIA_HZ', 60)),
    seed: Number(get('--seed', 'PRIMORDIA_SEED', 0x5eed1e55)) >>> 0,
    modulesDir: get('--modules', 'PRIMORDIA_MODULES_DIR', null),
    evolveSeconds: Number(get('--evolve', 'PRIMORDIA_EVOLVE_SECONDS', 15)),
    validate: argv.includes('--validate') || env.PRIMORDIA_VALIDATE === '1',
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const bridge = await createBridge(parseArgs(process.argv.slice(2)));
  const statTimer = setInterval(() => {
    const s = bridge.stats;
    console.log(`[bridge] t=${bridge.ctx.t.toFixed(1)}s rev=${bridge.ctx.manifest.revision} packets=${s.packets} kb=${(s.bytes / 1024).toFixed(0)} dropped=${s.dropped} invalid=${s.invalid}`);
  }, 10000);
  const shutdown = async () => {
    clearInterval(statTimer);
    await bridge.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
