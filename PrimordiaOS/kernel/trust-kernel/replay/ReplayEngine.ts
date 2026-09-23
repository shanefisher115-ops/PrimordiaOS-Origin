// ======================================================
// PRIMORDIAOS — REPLAY ENGINE
// ======================================================
// Responsibilities:
// - Deterministic replay of tasks + events
// - Uses snapshots + event logs + ledger
// - Supports full rewind + restore
// ======================================================

export interface ReplaySnapshot {
    state: any;
    events: any[];
    ledger: any[];
    timestamp: number;
}

export class ReplayEngine {
    private snapshots: ReplaySnapshot[] = [];

    constructor() {}

    // ------------------------------------------------------
    // CREATE SNAPSHOT
    // ------------------------------------------------------
    createSnapshot(state: any, events: any[], ledger: any[]) {
        const snapshot: ReplaySnapshot = {
            state: structuredClone(state),
            events: structuredClone(events),
            ledger: structuredClone(ledger),
            timestamp: Date.now()
        };

        this.snapshots.push(snapshot);
        return snapshot;
    }

    // ------------------------------------------------------
    // RESTORE SNAPSHOT
    // ------------------------------------------------------
    restore(snapshot: ReplaySnapshot) {
        return {
            state: structuredClone(snapshot.state),
            events: structuredClone(snapshot.events),
            ledger: structuredClone(snapshot.ledger)
        };
    }

    // ------------------------------------------------------
    // GET ALL SNAPSHOTS
    // ------------------------------------------------------
    list(): ReplaySnapshot[] {
        return [...this.snapshots];
    }

    // ------------------------------------------------------
    // CLEAR (REPLAY MODE)
    // ------------------------------------------------------
    clear() {
        this.snapshots = [];
    }
}
