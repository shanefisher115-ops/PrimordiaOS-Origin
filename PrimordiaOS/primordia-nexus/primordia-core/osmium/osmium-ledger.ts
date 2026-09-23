// osmium/osmium-ledger.ts
// PrimordiaOS Osmium Ledger — full implementation
// Append-only event ledger + idempotent commit system

import { EventEnvelope } from "../shared/event-bus";

export interface LedgerEntry {
    id: string;
    ts: number;
    event: EventEnvelope;
}

export class OsmiumLedger {
    private entries: LedgerEntry[];
    private committedIds: Set<string>;

    constructor() {
        this.entries = [];
        this.committedIds = new Set();
    }

    commit(event: EventEnvelope) {
        const id = `${event.topic}-${event.timestamp}`;

        // Idempotency: skip if already committed
        if (this.committedIds.has(id)) {
            return;
        }

        const entry: LedgerEntry = {
            id,
            ts: Date.now(),
            event
        };

        this.entries.push(entry);
        this.committedIds.add(id);
    }

    getEntries(): LedgerEntry[] {
        return this.entries;
    }

    getLastEntry(): LedgerEntry | null {
        if (this.entries.length === 0) return null;
        return this.entries[this.entries.length - 1];
    }

    getByTopic(topic: string): LedgerEntry[] {
        return this.entries.filter(e => e.event.topic === topic);
    }

    size(): number {
        return this.entries.length;
    }
}

export const osmiumLedger = new OsmiumLedger();
