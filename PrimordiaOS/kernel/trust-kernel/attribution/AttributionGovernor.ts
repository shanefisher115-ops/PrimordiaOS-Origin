// ======================================================
// PRIMORDIAOS — ATTRIBUTION GOVERNOR
// ======================================================
// Responsibilities:
// - Track lineage for every task, claim, and agent action
// - Compute contribution weights
// - Propagate credit across agents, realms, and claims
// - Integrate with Knowledge Graph + Ledger
// ======================================================

export interface LineageEntry {
    source: string;        // agent or realm
    timestamp: number;
    weight: number;
    description?: string;
}

export interface AttributionRecord {
    id: string;
    lineage: LineageEntry[];
    totalWeight: number;
    timestamp: number;
}

export class AttributionGovernor {
    private records: Map<string, AttributionRecord> = new Map();

    constructor() {}

    // ------------------------------------------------------
    // CREATE OR UPDATE ATTRIBUTION RECORD
    // ------------------------------------------------------
    recordAttribution(id: string, lineage: LineageEntry[]) {
        const totalWeight = lineage.reduce((acc, l) => acc + l.weight, 0);

        const record: AttributionRecord = {
            id,
            lineage,
            totalWeight,
            timestamp: Date.now()
        };

        this.records.set(id, record);
        return record;
    }

    // ------------------------------------------------------
    // ADD LINEAGE ENTRY
    // ------------------------------------------------------
    addLineage(id: string, entry: LineageEntry) {
        const existing = this.records.get(id);

        if (!existing) {
            return this.recordAttribution(id, [entry]);
        }

        existing.lineage.push(entry);
        existing.totalWeight += entry.weight;
        existing.timestamp = Date.now();

        this.records.set(id, existing);
        return existing;
    }

    // ------------------------------------------------------
    // GET ATTRIBUTION RECORD
    // ------------------------------------------------------
    getAttribution(id: string): AttributionRecord | null {
        return this.records.get(id) || null;
    }

    // ------------------------------------------------------
    // LIST ALL RECORDS
    // ------------------------------------------------------
    list(): AttributionRecord[] {
        return Array.from(this.records.values());
    }

    // ------------------------------------------------------
    // CLEAR (REPLAY MODE)
    // ------------------------------------------------------
    clear() {
        this.records.clear();
    }
}
