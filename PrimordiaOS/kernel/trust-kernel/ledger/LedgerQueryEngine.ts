// ======================================================
// PRIMORDIAOS — LEDGER QUERY ENGINE
// ======================================================
// Responsibilities:
// - Query immutable ledger entries
// - Filter by type, agent, realm, timestamp
// - Provide replay-ready slices
// ======================================================

import { Ledger, LedgerEntry } from "./Ledger";

export class LedgerQueryEngine {
    constructor(private ledger: Ledger) {}

    // ------------------------------------------------------
    // FILTER BY TYPE
    // ------------------------------------------------------
    byType(type: string): LedgerEntry[] {
        return this.ledger.filter(type);
    }

    // ------------------------------------------------------
    // FILTER BY AGENT
    // ------------------------------------------------------
    byAgent(agentId: string): LedgerEntry[] {
        return this.ledger.readAll().filter(e => e.payload?.agent === agentId);
    }

    // ------------------------------------------------------
    // FILTER BY REALM
    // ------------------------------------------------------
    byRealm(realm: string): LedgerEntry[] {
        return this.ledger.readAll().filter(e => e.payload?.realm === realm);
    }

    // ------------------------------------------------------
    // FILTER BY TIME RANGE
    // ------------------------------------------------------
    byTimeRange(start: number, end: number): LedgerEntry[] {
        return this.ledger.readAll().filter(e => e.timestamp >= start && e.timestamp <= end);
    }

    // ------------------------------------------------------
    // GET LAST N ENTRIES
    // ------------------------------------------------------
    last(n: number): LedgerEntry[] {
        const all = this.ledger.readAll();
        return all.slice(Math.max(0, all.length - n));
    }
}
