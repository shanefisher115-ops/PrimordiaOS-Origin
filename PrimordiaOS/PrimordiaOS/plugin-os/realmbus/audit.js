// ============================================================
//   REALMBUS AUDIT — Message Logging & Replay
// ============================================================
//
//   Every RealmMessage that passes through the bus is logged.
//   Supports filtering, time-range queries, and trace chain
//   reconstruction for debugging.
//
//   Uses an in-memory ring buffer by default.
//   Can be swapped for PostgreSQL persistence via bridge.js.
//
// ─── Audit Logger ───────────────────────────────────────────
export class AuditLogger {
    maxEntries;
    buffer = [];
    index = 0;
    listeners = new Set();
    constructor(
    /** Max entries before oldest are evicted */
    maxEntries = 10_000) {
        this.maxEntries = maxEntries;
    }
    // ── Log a Message ─────────────────────────────────────
    log(message, routed, routeFailure) {
        const entry = {
            index: this.index++,
            message,
            loggedAt: Date.now(),
            routed,
            routeFailure,
        };
        this.buffer.push(entry);
        // Evict oldest if over capacity
        if (this.buffer.length > this.maxEntries) {
            this.buffer.splice(0, this.buffer.length - this.maxEntries);
        }
        // Notify listeners
        for (const listener of this.listeners) {
            try {
                listener(entry);
            }
            catch (err) {
                console.error('[AUDIT] Listener error:', err);
            }
        }
        return entry;
    }
    // ── Query the Log ───────────────────────────────────────
    query(filter = {}) {
        let results = this.buffer;
        if (filter.source) {
            results = results.filter((e) => e.message.source === filter.source);
        }
        if (filter.target) {
            results = results.filter((e) => e.message.target === filter.target);
        }
        if (filter.type) {
            results = results.filter((e) => e.message.type === filter.type);
        }
        if (filter.intent) {
            results = results.filter((e) => e.message.intent.includes(filter.intent));
        }
        if (filter.traceId) {
            results = results.filter((e) => e.message.meta?.traceId === filter.traceId);
        }
        if (filter.fromTimestamp) {
            results = results.filter((e) => e.message.timestamp >= filter.fromTimestamp);
        }
        if (filter.toTimestamp) {
            results = results.filter((e) => e.message.timestamp <= filter.toTimestamp);
        }
        // Pagination
        const offset = filter.offset ?? 0;
        const limit = filter.limit ?? 100;
        return results.slice(offset, offset + limit);
    }
    // ── Get Trace Chain ─────────────────────────────────────
    //
    //    Given a traceId, returns all messages in the trace chain
    //    in chronological order.
    //
    getTraceChain(traceId) {
        return this.buffer
            .filter((e) => e.message.meta?.traceId === traceId)
            .sort((a, b) => a.message.timestamp - b.message.timestamp);
    }
    // ── Get Recent Entries ──────────────────────────────────
    getRecent(count = 50) {
        return this.buffer.slice(-count);
    }
    // ── Statistics ──────────────────────────────────────────
    getStats() {
        const now = Date.now();
        const oneMinuteAgo = now - 60_000;
        const recentEntries = this.buffer.filter((e) => e.loggedAt >= oneMinuteAgo);
        const byType = {};
        const byRealm = {};
        let errorCount = 0;
        let blockedCount = 0;
        for (const entry of recentEntries) {
            byType[entry.message.type] = (byType[entry.message.type] || 0) + 1;
            byRealm[entry.message.source] = (byRealm[entry.message.source] || 0) + 1;
            if (entry.message.type === 'error')
                errorCount++;
            if (!entry.routed && entry.routeFailure)
                blockedCount++;
        }
        return {
            totalEntries: this.buffer.length,
            messagesPerMinute: recentEntries.length,
            byType,
            byRealm,
            errorCount,
            blockedCount,
        };
    }
    // ── Subscribe to New Entries ────────────────────────────
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    // ── Clear (for testing) ─────────────────────────────────
    clear() {
        this.buffer = [];
        this.index = 0;
    }
    // ── Export (for persistence) ────────────────────────────
    export() {
        return [...this.buffer];
    }
}
