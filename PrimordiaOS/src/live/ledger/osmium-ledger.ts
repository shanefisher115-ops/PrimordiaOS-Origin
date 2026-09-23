const ledger = [];

export function recordSignals(signals) {
    for (const sig of signals) {
        ledger.push({
            id: sig.id,
            realm: sig.realm,
            magnitude: sig.magnitude,
            timestamp: sig.createdAt
        });
    }
}

export function getRecentLedger(limit = 20) {
    return ledger.slice(-limit);
}
