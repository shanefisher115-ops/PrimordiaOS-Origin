// Cloudflare (cloud) realm: Worker + Durable Object. Same agent.js, same HTTP contract as Docker.
//
//   Worker:  authenticates the kernel (Bearer PRIMORDIA_TOKEN secret), then forwards the request to
//            env.AGENT.get(env.AGENT.idFromName(<agent name>)). One DO instance per agent = one container.
//   DO:      storage keys replace the container files 1:1:
//              'memory'  <- state/memory.json      'context' <- state/context.json
//              'inbox'   <- inbox/events.json      'outbox'  <- outbox/actions.json
//              'seen'    -> { [eventId]: epochMs }  delivery-level idempotency store (TTL SEEN_TTL_MS)
//
//   POST /inbox          { events: [...] }  -> { ok, status, queued, dropped, drops, duplicates }
//   POST /outbox/drain                       -> { ok, status:"drained", actions }
//   POST /run                                -> { ok, status:"ran", processed, actions }
//   GET  /status                             -> { ok, name, version, realm, inbox, outbox, memory }   (no auth)
//   GET  /inbox, GET /outbox                 -> read-only views
//
// A DO processes one request at a time per instance (input gates), so the read-modify-write cycles
// below never interleave — no lock needed, unlike the folder realm.
import * as agent from '../agent.js';
import manifest from '../agent.json' with { type: 'json' };
import { runLoop, createKernelAdvisor } from './core.js';

const SEEN_TTL_MS = 24 * 60 * 60 * 1000;
// Model guidance: set PRIMORDIA_KERNEL_URL (var) + PRIMORDIA_TOKEN (secret) to give decide() an advise().
const loopOpts = (env) => ({ advise: createKernelAdvisor(env.PRIMORDIA_KERNEL_URL, env.PRIMORDIA_TOKEN, manifest.name) });

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function agentRuntime(request, env) {
  const { pathname } = new URL(request.url);
  if (pathname !== '/status' && env.PRIMORDIA_TOKEN) {
    if (!timingSafeEqual(request.headers.get('authorization') || '', `Bearer ${env.PRIMORDIA_TOKEN}`)) {
      return json({ ok: false, status: 'rejected', code: 'UNAUTHORIZED' }, 401);
    }
  }
  try {
    const stub = env.AGENT.get(env.AGENT.idFromName(manifest.name));
    return await stub.fetch(request);
  } catch (e) {
    // DO unreachable (reset, overloaded, deploy in progress): 503 tells the kernel to retry.
    return json({ ok: false, status: 'unavailable', code: 'DO_UNAVAILABLE', message: e.message }, 503);
  }
}

export class AgentContainer {
  constructor(state, env) {
    this.storage = state.storage;
    this.env = env || {};
  }

  io() {
    const s = this.storage;
    return {
      read: async (key, fallback) => (await s.get(key)) ?? fallback,
      write: (key, value) => s.put(key, value),
      log: (line) => console.log(`[${manifest.name}@cloud] ${line}`),
    };
  }

  async fetch(request) {
    const { pathname } = new URL(request.url);
    const io = this.io();
    try {
      if (request.method === 'POST' && pathname === '/inbox') return json(await this.deliver(await request.json(), io));
      if (request.method === 'POST' && pathname === '/outbox/drain') {
        const actions = await io.read('outbox', []);
        await io.write('outbox', []);
        return json({ ok: true, status: 'drained', actions });
      }
      if (request.method === 'POST' && pathname === '/run') {
        const out = await runLoop(agent, manifest, io, 'cloud', loopOpts(this.env));
        return json({ ok: true, status: 'ran', processed: out.processed, actions: out.actions });
      }
      if (request.method === 'GET' && pathname === '/status') {
        const memory = await io.read('memory', {});
        return json({
          ok: true, name: manifest.name, version: manifest.version, realm: 'cloud',
          capabilities: manifest.capabilities,
          inbox: (await io.read('inbox', [])).length, outbox: (await io.read('outbox', [])).length,
          memory: { loops: memory.loops ?? 0, last_run: memory.last_run ?? null },
        });
      }
      if (request.method === 'GET' && (pathname === '/inbox' || pathname === '/outbox')) {
        const key = pathname.slice(1);
        return json({ ok: true, [key]: await io.read(key, []) });
      }
      return json({ ok: false, code: 'NOT_FOUND' }, 404);
    } catch (e) {
      return json({ ok: false, code: e instanceof SyntaxError ? 'BAD_REQUEST' : 'INTERNAL', message: e.message }, e instanceof SyntaxError ? 400 : 500);
    }
  }

  // Idempotency + depth enforcement at the container boundary (defense in depth: the kernel already
  // checked both, but the DO must be safe even if something else can reach the Worker).
  async deliver(body, io) {
    const incoming = Array.isArray(body) ? body : Array.isArray(body?.events) ? body.events : [body];
    const max = manifest.safety?.max_loop_depth ?? 5;
    const now = Date.now();
    const seen = (await io.read('seen', {})) ?? {};
    for (const [id, at] of Object.entries(seen)) if (now - at > SEEN_TTL_MS) delete seen[id];

    const inbox = await io.read('inbox', []);
    const queued = []; const drops = []; let duplicates = 0;
    for (const e of incoming) {
      if (!e || typeof e !== 'object' || typeof e.type !== 'string' || typeof e.id !== 'string') { drops.push({ id: e?.id, code: 'INVALID_ENVELOPE' }); continue; }
      if (!Number.isInteger(e.depth) || e.depth >= max) { drops.push({ id: e.id, code: 'DEPTH_EXCEEDED', depth: e.depth, max_loop_depth: max }); continue; }
      if (seen[e.id]) { duplicates++; continue; }
      seen[e.id] = now;
      queued.push(e);
    }
    await io.write('inbox', inbox.concat(queued));
    await io.write('seen', seen);
    drops.forEach((d) => io.log(`DROP ${d.id}: ${d.code}`));

    let ran = null;
    if (this.env.AUTORUN === '1' && queued.length) {
      const out = await runLoop(agent, manifest, io, 'cloud', loopOpts(this.env));
      ran = { processed: out.processed, actions: out.actions.length };
    }
    return {
      ok: true,
      status: queued.length ? 'queued' : duplicates ? 'duplicate' : 'dropped',
      queued: queued.length, dropped: drops.length, drops, duplicates, ran,
    };
  }
}

export default {
  fetch(request, env) {
    return agentRuntime(request, env);
  },
};
