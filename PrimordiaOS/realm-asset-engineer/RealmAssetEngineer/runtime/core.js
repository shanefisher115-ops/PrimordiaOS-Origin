// PrimordiaOS agent runtime core v1.2 — realm-independent loop + loop-manager safety.
// Every realm wrapper calls runLoop() with an `io` adapter: { read(key, fallback), write(key, value), log(line) }.
// Keys: 'memory', 'context', 'inbox', 'outbox'.
//
// v1.1 (kernel router): actions carry the full envelope { id, type, payload, depth, origin, target, timestamp };
// `origin` is always this agent (it cannot be spoofed from act()); inbox clearing removes only what
// this loop consumed, so events delivered mid-loop are never lost.
//
// v1.2 (model policy layer): runLoop(agent, manifest, io, realm, { advise }) passes `advise` into
// decide(state). advise(event, memory) asks the kernel's policy engine for model guidance and returns
// only policy-approved envelopes (with provenance). agent.js stays free of I/O: it just calls the
// function it was handed, and works without it (advise is undefined when no kernel is configured).

const SEEN_LIMIT = 500; // recent event ids kept for idempotency

function normalizeEvent(e, i, name) {
  return {
    id: e.id ?? `evt_${Date.now()}_${i}`,
    type: e.type ?? 'task',
    origin: e.origin ?? e.source ?? 'kernel',
    target: e.target ?? name,
    depth: Number.isInteger(e.depth) ? e.depth : 0,
    timestamp: e.timestamp ?? new Date().toISOString(),
    payload: e.payload ?? {},
    ...(e.capability ? { capability: e.capability } : {}),
    ...(e.provenance ? { provenance: e.provenance } : {}), // e.g. pixelstream/unreal tags, model call ids
  };
}

function checkPromotionRules(action, manifest) {
  const rules = manifest.safety?.promotion_rules ?? [];
  if (rules.includes('no-infinite-recursion') && action.target === manifest.name) {
    return 'no-infinite-recursion: agent may not target itself';
  }
  if (rules.includes('no-self-promotion') && action.type === 'promote' && action.payload?.agent === manifest.name) {
    return 'no-self-promotion: agent may not promote itself';
  }
  return null;
}

/**
 * advise() bound to a kernel: POST {kernelUrl}/advise { agent, event, memory }.
 * Returns the policy engine result; on any transport failure returns { outcome: 'unavailable' } so the
 * agent can fall back to its deterministic heuristic instead of failing the loop.
 */
export function createKernelAdvisor(kernelUrl, token, agentName, timeoutMs = 90000) {
  if (!kernelUrl) return undefined;
  const base = kernelUrl.replace(/\/+$/, '');
  return async function advise(event, memory) {
    try {
      const res = await fetch(`${base}/advise`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ agent: agentName, event, memory }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { outcome: 'unavailable', code: body.code || `HTTP_${res.status}`, actions: [] };
      return body;
    } catch (e) {
      return { outcome: 'unavailable', code: 'KERNEL_UNREACHABLE', message: e.message, actions: [] };
    }
  };
}

let seq = 0;
function actionId(name) {
  seq = (seq + 1) % 1e6;
  return `${name}-${Date.now().toString(36)}-${seq.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function runLoop(agent, manifest, io, realm, opts = {}) {
  const safety = manifest.safety ?? {};
  const maxDepth = safety.max_loop_depth ?? 5;
  // Snapshot under the short I/O lock (if the realm has one); agent code runs without it.
  const withLock = io.withLock ?? ((fn) => fn());
  const { memory, rawInbox } = await withLock(async () => ({
    memory: (await io.read('memory', {})) ?? {},
    rawInbox: (await io.read('inbox', [])) ?? [],
  }));
  const seen = new Set(memory._seen_event_ids ?? []);

  const events = [];
  rawInbox.map((e, i) => normalizeEvent(e, i, manifest.name)).forEach((e) => {
    if (e.depth >= maxDepth) return io.log(`DROP ${e.id}: depth ${e.depth} >= max_loop_depth ${maxDepth}`);
    if (safety.idempotent && seen.has(e.id)) return io.log(`SKIP ${e.id}: already processed`);
    events.push(e);
  });

  const context = { realm, started_at: new Date().toISOString() }; // fresh every loop
  if (agent.init) await agent.init({ manifest, realm, memory });

  const observations = await agent.perceive({ events, memory, context });
  const decision = await agent.decide({ observations, memory, context, advise: opts.advise });
  const proposed = (await agent.act(decision)) ?? [];

  // If an action doesn't carry depth, assume the deepest event that triggered this loop,
  // so an agent can't accidentally reset the hop counter and loop forever.
  const inheritedDepth = Math.max(0, ...events.map((e) => e.depth));
  const actions = [];
  for (const a of proposed) {
    const action = {
      id: a.id ?? actionId(manifest.name),
      type: a.type ?? 'result',
      payload: a.payload ?? {},
      target: a.target,
      ...(a.capability ? { capability: a.capability } : {}),
      ...(a.provenance ? { provenance: a.provenance } : {}),
      depth: Math.max(Number.isInteger(a.depth) ? a.depth : 0, inheritedDepth) + 1,
      origin: manifest.name,
      timestamp: new Date().toISOString(),
    };
    if (!action.target) { io.log(`BLOCK action ${action.id}: no target`); continue; }
    const violation = checkPromotionRules(action, manifest);
    if (violation) { io.log(`BLOCK action -> ${action.target}: ${violation}`); continue; }
    if (action.depth >= maxDepth) { io.log(`BLOCK action -> ${action.target}: would exceed max_loop_depth`); continue; }
    actions.push(action);
  }

  const newMemory = (await agent.persist({ memory, decision, actions })) ?? memory;
  events.forEach((e) => seen.add(e.id));
  newMemory._seen_event_ids = [...seen].slice(-SEEN_LIMIT);

  await withLock(async () => {
    const outbox = (await io.read('outbox', [])) ?? [];
    await io.write('outbox', [...outbox, ...actions]);
    const inboxNow = (await io.read('inbox', [])) ?? [];
    await io.write('inbox', inboxNow.slice(rawInbox.length)); // keep anything delivered during the loop
    await io.write('context', context);                        // ephemeral snapshot for debugging
    await io.write('memory', newMemory);
  });
  io.log(`LOOP ok: ${events.length} events in, ${actions.length} actions out`);

  return { processed: events.length, actions };
}
