// ======================================================
// PRIMORDIAOS — LEDGER
// ======================================================
// Responsibilities:
// - Immutable event log
// - State transition log
// - Consensus + verification logs
// - Replay-safe serialization
// ======================================================

export interface LedgerEntry {
    id: string;
    type: string;          // event, state, consensus, verification
    payload: any;
    timestamp: number;
}

export class Ledger {
    private entries: LedgerEntry[] = [];

    constructor() {}

    // ------------------------------------------------------
    // WRITE ENTRY
    // ------------------------------------------------------
    write(type: string, payload: any) {
        const entry: LedgerEntry = {
            id: "ledger-" + Math.random().toString(36).substring(2, 10),
            type,
            payload,
            timestamp: Date.now()
        };

        this.entries.push(entry);
        return entry;
    }

    // ------------------------------------------------------
    // READ ALL
    // ------------------------------------------------------
    readAll(): LedgerEntry[] {
        return [...this.entries];
    }

    // ------------------------------------------------------
    // FILTER BY TYPE
    // ------------------------------------------------------
    filter(type: string): LedgerEntry[] {
        return this.entries.filter(e => e.type === type);
    }

    // ------------------------------------------------------
    // CLEAR (REPLAY MODE)
    // ------------------------------------------------------
    clear() {
        this.entries = [];
    }
}
