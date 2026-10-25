#!/usr/bin/env node
// PrimordiaOS -> Unreal bridge. Serves PRS-1 packets on ws://127.0.0.1:7777.
//
//   node src/server.js [--port 7777] [--host 127.0.0.1] [--hz 60] [--seed 1234]
//                      [--modules ./my-modules] [--evolve 15] [--validate]
//                      [--ollama http://127.0.0.1:11434] [--realm-model llama3.2:3b]
//                      [--voice-model llama3.2:3b] [--voice af_heart] [--voice-dtype fp32] [--voice-preload]
//
// Every option also reads PRIMORDIA_<NAME> from the environment.
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'node:url';
import { createMetaState, snapshotMetaphysics } from './state.js';
import { loadModules } from './modules/index.js';
import { validatePacket } from './schemas.js';
import { designRealm } from './realm/design.js';
import { DEFAULT_OLLAMA_URL } from './llm/ollama.js';
import { createTTS } from './voice/tts.js';
import { createSpeaker } from './voice/speaker.js';
import { direct, describeRealm } from './voice/director.js';
import { createOnyxHub } from './gpu/onyx.js';
import { createTuner } from './gpu/tuner.js';
import { startGpuSidecar } from './gpu/sidecar.js';

export const VERSION = '1.0.0';
const MAX_BUFFERED_BYTES = 1 << 20; // above this a client is lagging: drop continuous frames
// Audio chunks are never dropped or rate-limited: a gap is audible.
const ALWAYS_DELIVER = new Set(['realm_manifest', 'hello', 'ack', 'pong', 'voice']);
// GPU telemetry is for dashboards and tools, not renderers: delivered only on subscription.
const OPT_IN = new Set(['gpu_telemetry']);

export async function createBridge(options = {}) {
  const {
    port = 7777,
    host = '127.0.0.1',
    hz = 60,
    seed = 0x5eed1e55,
    modulesDir = null,
    evolveSeconds = 15,
    validate = false,
    ollamaUrl = DEFAULT_OLLAMA_URL,
    realmModel = 'llama3.2:3b',
    voiceModel = realmModel,     // LLM for converse
    voiceDtype = 'fp32',         // Kokoro precision (see src/voice/tts.js)
    voiceName = 'af_heart',
    voicePreload = false,        // load Kokoro at startup instead of on first speech
    ttsFactory = createTTS,      // injectable for tests
    gpuSidecar = null,           // path to primordia_realmd: run the Vulkan engine as a sidecar
    gpuSidecarArgs = [],
    gpuTuner = {},               // tuner thresholds (src/gpu/tuner.js)
    gpuQuality = null,           // pin the realm quality (0.05-1) instead of letting the tuner move it
    gpuTelemetryHz = 4,          // gpu_telemetry broadcast rate per source
    log = console.log,
  } = options;
  let design = null; // { controller } while a generate_realm is in flight
  const overrides = new Map(); // perturbations: key -> { value, hold, fade, elapsed }
  const applyOverrides = (dt) => {
    for (const [key, o] of overrides) {
      o.elapsed += dt;
      const w = o.elapsed <= o.hold ? 1 : Math.max(0, 1 - (o.elapsed - o.hold) / o.fade);
      ctx.state[key] += (o.value - ctx.state[key]) * w;
      if (w === 0) overrides.delete(key);
    }
  };
  let speaking = null; // { controller } while a speak/converse is in flight

  let ttsPromise = null;
  const getTts = () => {
    ttsPromise ??= ttsFactory({ dtype: voiceDtype, voice: voiceName }).catch((err) => {
      ttsPromise = null;
      throw err;
    });
    return ttsPromise;
  };
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

  const speaker = createSpeaker({
    getTts,
    log,
    emit: (packet) => {
      const encoded = encode(packet);
      for (const c of clients) deliver(c, encoded);
    },
  });
  if (voicePreload) {
    const t = performance.now();
    getTts().then(
      () => log(`[voice] Kokoro ${voiceDtype} ready in ${((performance.now() - t) / 1000).toFixed(1)}s`),
      (err) => log(`[voice] Kokoro unavailable: ${err.message}`),
    );
  }

  function deliver(client, { env, text }) {
    const ws = client.ws;
    if (ws.readyState !== ws.OPEN) return;
    if (client.streams && !client.streams.has(env.type) && !ALWAYS_DELIVER.has(env.type)) return;
    // Opt-in streams reach only clients that asked for them by name (renderers do not want them).
    if (OPT_IN.has(env.type) && !client.streams?.has(env.type)) return;
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

  // --- The GPU loop: Onyx telemetry in, realm quality out (docs/GPU_PIPELINE.md) -----------
  ctx.gpuQuality = 1;
  const onyxHub = createOnyxHub();
  const tuner = createTuner(gpuTuner);
  if (gpuQuality !== null && gpuQuality !== undefined) ctx.gpuQuality = tuner.pin(gpuQuality);
  let sidecar = null;
  let sidecarManifestKey = '';
  let sidecarMetaAt = 0;
  let gpuBroadcastAt = 0;

  function applyGpuQuality(reason) {
    const quality = tuner.quality;
    if (quality === ctx.gpuQuality) return;
    ctx.gpuQuality = quality;
    log(`[gpu] realm quality ${quality} (${reason})`);
    sidecar?.send({ type: 'quality', scale: quality });
  }

  function ingestTelemetry(source, frame) {
    const errors = onyxHub.ingest(source, frame);
    if (errors.length) return errors;
    const worst = onyxHub.worst();
    const decision = worst && tuner.observe(worst.load, performance.now() / 1000);
    if (decision) applyGpuQuality(`${decision.reason}: ${worst.source} at ${Math.round(decision.load * 100)}% of budget`);
    return [];
  }

  function pumpGpu() {
    const now = performance.now() / 1000;
    if (clients.size && now - gpuBroadcastAt >= 1 / gpuTelemetryHz) {
      gpuBroadcastAt = now;
      for (const p of onyxHub.takePackets({ tuner: tuner.state() }, gpuTelemetryHz)) {
        const encoded = encode(p);
        for (const c of clients) deliver(c, encoded);
      }
    }
    if (sidecar?.alive) {
      // The sidecar simulates the authored realm; quality reaches it as its own message.
      const key = `${ctx.manifest.realm_id}#${ctx.manifest.revision}`;
      if (key !== sidecarManifestKey) {
        sidecarManifestKey = key;
        sidecar.send({ type: 'manifest', manifest: ctx.manifest });
      }
      if (now - sidecarMetaAt >= 0.1) {
        sidecarMetaAt = now;
        sidecar.send({ type: 'metaphysics', metaphysics: snapshotMetaphysics(ctx.state) });
      }
    }
  }

  if (gpuSidecar) {
    sidecar = startGpuSidecar({
      exe: gpuSidecar,
      args: gpuSidecarArgs,
      log,
      onMessage(msg) {
        if (msg.type === 'telemetry') {
          const errors = ingestTelemetry(msg.source ?? 'vulkan-sidecar', msg);
          if (errors.length) log(`[gpu] sidecar telemetry rejected: ${errors.slice(0, 3).join('; ')}`);
        } else if (msg.type === 'mcp_results') {
          const { type, ...results } = msg;
          onyxHub.attachResults('vulkan-sidecar', results);
        } else if (msg.type === 'ready') {
          log(`[gpu] Vulkan sidecar ready on ${msg.device} (${msg.actors} actors)`);
        } else if (msg.type === 'error') {
          log(`[gpu] sidecar error: ${msg.message}`);
        }
      },
    });
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
        // Modules recompute these every tick, so a perturbation is an override applied
        // after each step: held for holdSeconds, then faded back to the natural value.
        if (!(args.key in ctx.state) || typeof ctx.state[args.key] !== 'number' || typeof args.value !== 'number') {
          throw new Error(`cannot perturb ${args.key}`);
        }
        overrides.set(args.key, { value: args.value, hold: Number(args.hold) || 20, fade: 10, elapsed: 0 });
        ctx.state[args.key] = args.value;
        break;
      }
      case 'load_manifest':
        worldforge.loadManifest?.(ctx, args.manifest);
        break;
      case 'generate_realm':
        // {name:"generate_realm", args:{description:"...", model?, seed?}}
        startDesign(client, args);
        return { status: 'started', model: args.model || realmModel };
      case 'cancel_generate':
        design?.controller.abort();
        break;
      case 'speak':
        // {name:"speak", args:{text:"...", speaker?:"soul"}}: voice only, no LLM
        startSpeech(client, 'speak', args, async (utter) => {
          if (!String(args.text ?? '').trim()) throw new Error('speak needs args.text');
          for (const s of splitForSpeech(args.text)) utter.say(s);
          return {};
        });
        return { status: 'started' };
      case 'converse':
        // {name:"converse", args:{input:"...", model?}}: the LLM decides what to say and do
        if (!String(args.input ?? '').trim()) throw new Error('converse needs args.input');
        startSpeech(client, 'converse', args, async (utter, signal) => {
          const { say, actions, stats } = await direct(String(args.input), {
            url: ollamaUrl,
            model: args.model || voiceModel,
            realm: describeRealm(ctx.manifest, ctx.state),
            signal,
            onSentence: (s) => utter.say(s),
          });
          // Actions run as soon as the LLM finishes, while the voice may still be speaking.
          const action_results = actions.map((a) => runAction(client, a));
          return { say, actions, action_results, llm_seconds: Math.round(stats.seconds * 10) / 10, tokens: stats.genTokens };
        });
        return { status: 'started' };
      case 'cancel_speech':
        speaking?.controller.abort();
        break;
      case 'set_quality': {
        // {name:"set_quality", args:{scale:0.6}} pins the GPU quality; {scale:null} unpins it.
        const scale = args.scale === null || args.scale === undefined ? null : Number(args.scale);
        if (scale !== null && !Number.isFinite(scale)) throw new Error('set_quality needs a numeric scale or null');
        tuner.pin(scale);
        applyGpuQuality(scale === null ? 'tuner resumed' : 'pinned by command');
        return { quality: tuner.quality };
      }
      case 'set_gpu_budget': {
        const ms = Number(args.ms);
        if (!(ms > 0)) throw new Error('set_gpu_budget needs args.ms > 0');
        sidecar?.send({ type: 'budget', ms });
        return { budget_ms: ms, sidecar: Boolean(sidecar?.alive) };
      }
      default:
        throw new Error(`unknown command ${name}`);
    }
  }

  const splitForSpeech = (text) => String(text).split(/(?<=[.!?…])\s+/).filter((s) => s.trim());

  // Where the realm's voice comes from: its soul glyph.
  const soulPosition = () => ctx.manifest?.glyphs?.find((g) => g.kind === 'soul')?.position ?? [0, 0, 14];

  // An LLM-chosen action, executed through the same command paths as Unreal's.
  function runAction(client, action) {
    try {
      switch (action.type) {
        case 'perturb':
          handleCommand(client, { name: 'perturb', args: { key: action.key, value: action.value } });
          return `${action.key} = ${action.value}`;
        case 'evolve_realm':
          handleCommand(client, { name: 'evolve_realm' });
          return 'realm evolving';
        case 'reseed':
          handleCommand(client, { name: 'reseed', args: { seed: action.seed } });
          return `new realm ${ctx.manifest.realm_name}`;
        case 'generate_realm':
          startDesign(client, { description: action.description });
          return 'designing realm';
        default:
          return 'none';
      }
    } catch (err) {
      return `failed: ${err.message}`;
    }
  }

  // speak/converse share one pipeline: ack started -> voice packets -> ack done/failed.
  function startSpeech(client, command, args, body) {
    if (speaking) throw new Error('already speaking');
    const controller = new AbortController();
    speaking = { controller };
    const utter = speaker.begin({ speaker: args.speaker || 'soul', position: soulPosition(), voice: args.voice });
    const t0 = performance.now();
    (async () => {
      let result;
      let bodyError = null;
      try {
        result = await body(utter, controller.signal);
      } catch (err) {
        bodyError = err;
      }
      const audio = await utter.end(); // always close the utterance; throws if synthesis failed
      if (bodyError) throw bodyError;
      return { ...result, ...audio, seconds: Math.round((performance.now() - t0) / 100) / 10 };
    })()
      .then((done) => {
        log(`[voice] ${command} done in ${done.seconds}s (first audio ${done.firstAudioSeconds}s, ${done.audioSeconds}s of speech)`);
        reply(client, 'ack', { command, ok: true, status: 'done', ...done });
      })
      .catch((err) => {
        log(`[voice] ${command} failed: ${err.message}`);
        reply(client, 'ack', { command, ok: false, status: 'failed', error: err.message });
      })
      .finally(() => {
        speaking = null;
      });
  }

  // The LLM designs a compact intent; Worldforge expands it (realm/design.js).
  // The new manifest reaches every client through the realm_manifest stream;
  // the requesting client also gets a final ack with timings.
  function startDesign(client, args) {
    const description = String(args.description ?? '').trim();
    if (!description) throw new Error('generate_realm needs args.description');
    if (design) throw new Error('a realm is already being designed');
    const worldforge = modules.find((m) => m.key === 'worldforge');
    const model = args.model || realmModel;
    const controller = new AbortController();
    design = { controller };
    log(`[bridge] designing realm with ${model}: "${description.slice(0, 80)}"`);
    designRealm(description, { url: ollamaUrl, model, seed: args.seed, signal: controller.signal })
      .then(({ manifest, intent, stats }) => {
        if (intent.understood?.length) log(`[bridge] understood: ${intent.understood.join('; ')}`);
        worldforge.loadManifest(ctx, manifest);
        // Broadcast now (not at the next 1 Hz Worldforge sample) so clients have the
        // realm before they see the "done" ack.
        for (const p of worldforge.sample(ctx)) {
          const encoded = encode(p);
          for (const c of clients) deliver(c, encoded);
        }
        log(`[bridge] designed "${manifest.realm_name}" in ${stats.seconds.toFixed(1)}s (${stats.genTokens} tokens, ${stats.tokensPerSecond.toFixed(1)} tok/s)`);
        reply(client, 'ack', {
          command: 'generate_realm',
          ok: true,
          status: 'done',
          realm_id: manifest.realm_id,
          realm_name: manifest.realm_name,
          intent,
          seconds: Math.round(stats.seconds * 10) / 10,
          tokens: stats.genTokens,
          tokens_per_second: Math.round(stats.tokensPerSecond * 10) / 10,
        });
      })
      .catch((err) => {
        log(`[bridge] realm design failed: ${err.message}`);
        reply(client, 'ack', { command: 'generate_realm', ok: false, status: 'failed', error: err.message });
      })
      .finally(() => {
        design = null;
      });
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
      case 'telemetry': {
        // Onyx frames from a renderer (Unreal's OnyxRuntime module sends these).
        const errors = ingestTelemetry(String(msg.source ?? client.name), msg);
        if (errors.length) reply(client, 'ack', { command: 'telemetry', ok: false, error: errors.slice(0, 3).join('; ') });
        return;
      }
      case 'command':
        try {
          const extra = handleCommand(client, msg);
          return reply(client, 'ack', { command: msg.name, ok: true, ...extra });
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
      streams: { ...streams, gpu_telemetry: gpuTelemetryHz },
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
    applyOverrides(dt);
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
    pumpGpu();
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
      await sidecar?.close();
      design?.controller.abort();
      speaking?.controller.abort();
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
    ollamaUrl: get('--ollama', 'PRIMORDIA_OLLAMA_URL', DEFAULT_OLLAMA_URL),
    realmModel: get('--realm-model', 'PRIMORDIA_REALM_MODEL', 'llama3.2:3b'),
    voiceModel: get('--voice-model', 'PRIMORDIA_VOICE_MODEL', 'llama3.2:3b'),
    voiceDtype: get('--voice-dtype', 'PRIMORDIA_VOICE_DTYPE', 'fp32'),
    voiceName: get('--voice', 'PRIMORDIA_VOICE', 'af_heart'),
    voicePreload: argv.includes('--voice-preload') || env.PRIMORDIA_VOICE_PRELOAD === '1',
    // The standalone Vulkan engine (realm-bridge/gpu): path to primordia_realmd.exe.
    gpuSidecar: get('--gpu-sidecar', 'PRIMORDIA_GPU_SIDECAR', null),
    // Pin the GPU quality (e.g. 1 for look-dev renders); omit to let the tuner follow Onyx.
    gpuQuality: get('--gpu-quality', 'PRIMORDIA_GPU_QUALITY', null) === null ? null : Number(get('--gpu-quality', 'PRIMORDIA_GPU_QUALITY', null)),
    gpuSidecarArgs: ['--actors', String(Number(get('--gpu-actors', 'PRIMORDIA_GPU_ACTORS', 2048)))].concat(
      argv.includes('--gpu-window') || env.PRIMORDIA_GPU_WINDOW === '1' ? ['--window'] : [],
    ),
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
