// Onyx on the PrimordiaOS side: ingests GPU telemetry frames from every renderer that
// reports them (Unreal's OnyxRuntime module, the standalone Vulkan sidecar), keeps the
// latest frame per source, and measures how loaded the busiest GPU is.
import { validate, payloadSchemas } from '../schemas.js';

/** How close a frame is to its limits: 1 = exactly on budget (time or memory). */
export function loadOf(frame) {
  const gpu = frame.gpu ?? {};
  const time = gpu.budget_ms > 0 ? gpu.frame_ms / gpu.budget_ms : 0;
  const memory = (gpu.memory_pressure ?? 0) / 0.9; // leave 10% of the budget free
  return Math.max(time, memory);
}

export function createOnyxHub({ maxAgeSeconds = 3, now = () => performance.now() / 1000 } = {}) {
  const sources = new Map(); // source -> { frame, at, broadcastAt }

  const fresh = () => [...sources.entries()].filter(([, s]) => now() - s.at <= maxAgeSeconds);

  return {
    /** Validates and stores a frame. Returns the schema errors (empty when accepted). */
    ingest(source, frame) {
      const payload = { ...frame, source };
      delete payload.type;
      const errors = validate(payload, payloadSchemas.gpu_telemetry, '$');
      if (errors.length) return errors;
      const prev = sources.get(source);
      sources.set(source, { frame: payload, at: now(), broadcastAt: prev?.broadcastAt ?? -Infinity, mcp: prev?.mcp });
      return [];
    },
    /** Attaches the latest MCP results summary (sidecar `mcp_results`) to a source. */
    attachResults(source, results) {
      const s = sources.get(source);
      if (s) s.mcp = results;
    },
    /** The most loaded fresh source, or null when nobody reported recently. */
    worst() {
      let best = null;
      for (const [source, s] of fresh()) {
        const load = loadOf(s.frame);
        if (!best || load > best.load) best = { source, load, frame: s.frame };
      }
      return best;
    },
    /** Frames not yet broadcast, at most `hz` per source, as gpu_telemetry packets. */
    takePackets(extra = {}, hz = 4) {
      const out = [];
      for (const [source, s] of fresh()) {
        if (s.at <= s.broadcastAt || now() - s.broadcastAt < 1 / hz) continue;
        s.broadcastAt = now();
        const payload = { ...s.frame, ...extra };
        if (s.mcp) payload.mcp = s.mcp;
        out.push({ type: 'gpu_telemetry', id: `onyx:${source}`, payload });
      }
      return out;
    },
    sources: () => fresh().map(([source, s]) => ({ source, frame: s.frame, age: now() - s.at })),
  };
}
