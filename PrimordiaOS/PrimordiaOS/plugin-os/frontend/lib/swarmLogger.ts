// ============================================================
//   SWARM LOGGER — PURL Telemetry Emitter
// ============================================================
//
//   Ring-buffer event store with subscriber pattern.
//   Every PURL execution dispatches runtime telemetry here,
//   making the runtime visible inside the Swarm Monitor.
//

// ─── Types ──────────────────────────────────────────────────
export interface RuntimeEvent {
  traceId: string;
  source: string;
  intent: string;
  engineRoute: string | null;
  executionTimeMs: number;
  status: "OK" | "ERROR" | "BLOCKED";
  payload: Record<string, unknown>;
  violations: string[];
  timestamp: number;
}

export type EventFilter = {
  source?: string;
  status?: RuntimeEvent["status"];
  engine?: string;
};

export type EventSubscriber = (event: RuntimeEvent) => void;

// ─── Ring Buffer ────────────────────────────────────────────
const MAX_EVENTS = 500;
let events: RuntimeEvent[] = [];
const subscribers: Set<EventSubscriber> = new Set();

// ─── Dispatch ───────────────────────────────────────────────
export function dispatch(source: string, event: Omit<RuntimeEvent, "source" | "timestamp">): void {
  const fullEvent: RuntimeEvent = {
    ...event,
    source,
    timestamp: Date.now(),
  };

  events.push(fullEvent);

  // Enforce ring buffer limit
  if (events.length > MAX_EVENTS) {
    events = events.slice(events.length - MAX_EVENTS);
  }

  // Notify all subscribers
  for (const sub of subscribers) {
    try {
      sub(fullEvent);
    } catch {
      // Subscriber errors must not crash the logger
    }
  }
}

// ─── Query ──────────────────────────────────────────────────
export function getEvents(filter?: EventFilter): RuntimeEvent[] {
  if (!filter) return [...events];

  return events.filter((ev) => {
    if (filter.source && ev.source !== filter.source) return false;
    if (filter.status && ev.status !== filter.status) return false;
    if (filter.engine && ev.engineRoute !== filter.engine) return false;
    return true;
  });
}

// ─── Get Latest ─────────────────────────────────────────────
export function getLatestEvent(): RuntimeEvent | null {
  return events.length > 0 ? events[events.length - 1] : null;
}

// ─── Subscribe ──────────────────────────────────────────────
export function subscribe(callback: EventSubscriber): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

// ─── Event Count ────────────────────────────────────────────
export function getEventCount(): number {
  return events.length;
}

// ─── Clear (for testing) ────────────────────────────────────
export function clearEvents(): void {
  events = [];
}

// ─── Default Export ─────────────────────────────────────────
const swarmLogger = {
  dispatch,
  getEvents,
  getLatestEvent,
  subscribe,
  getEventCount,
  clearEvents,
};

export default swarmLogger;
