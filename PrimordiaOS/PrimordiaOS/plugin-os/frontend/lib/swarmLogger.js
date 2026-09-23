"use strict";
// ============================================================
//   SWARM LOGGER — PURL Telemetry Emitter
// ============================================================
//
//   Ring-buffer event store with subscriber pattern.
//   Every PURL execution dispatches runtime telemetry here,
//   making the runtime visible inside the Swarm Monitor.
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatch = dispatch;
exports.getEvents = getEvents;
exports.getLatestEvent = getLatestEvent;
exports.subscribe = subscribe;
exports.getEventCount = getEventCount;
exports.clearEvents = clearEvents;
// ─── Ring Buffer ────────────────────────────────────────────
const MAX_EVENTS = 500;
let events = [];
const subscribers = new Set();
// ─── Dispatch ───────────────────────────────────────────────
function dispatch(source, event) {
    const fullEvent = {
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
        }
        catch {
            // Subscriber errors must not crash the logger
        }
    }
}
// ─── Query ──────────────────────────────────────────────────
function getEvents(filter) {
    if (!filter)
        return [...events];
    return events.filter((ev) => {
        if (filter.source && ev.source !== filter.source)
            return false;
        if (filter.status && ev.status !== filter.status)
            return false;
        if (filter.engine && ev.engineRoute !== filter.engine)
            return false;
        return true;
    });
}
// ─── Get Latest ─────────────────────────────────────────────
function getLatestEvent() {
    return events.length > 0 ? events[events.length - 1] : null;
}
// ─── Subscribe ──────────────────────────────────────────────
function subscribe(callback) {
    subscribers.add(callback);
    return () => {
        subscribers.delete(callback);
    };
}
// ─── Event Count ────────────────────────────────────────────
function getEventCount() {
    return events.length;
}
// ─── Clear (for testing) ────────────────────────────────────
function clearEvents() {
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
exports.default = swarmLogger;
