// osmium/osmium-ledger.ts
// PrimordiaOS Osmium Ledger — full implementation
// Append-only event ledger + idempotent commit system
export class OsmiumLedger {
    entries;
    committedIds;
    constructor() {
        this.entries = [];
        this.committedIds = new Set();
    }
    commit(event) {
        const id = `${event.topic}-${event.timestamp}`;
        // Idempotency: skip if already committed
        if (this.committedIds.has(id)) {
            return;
        }
        const entry = {
            id,
            ts: Date.now(),
            event
        };
        this.entries.push(entry);
        this.committedIds.add(id);
    }
    getEntries() {
        return this.entries;
    }
    getLastEntry() {
        if (this.entries.length === 0)
            return null;
        return this.entries[this.entries.length - 1];
    }
    getByTopic(topic) {
        return this.entries.filter(e => e.event.topic === topic);
    }
    size() {
        return this.entries.length;
    }
}
export const osmiumLedger = new OsmiumLedger();
