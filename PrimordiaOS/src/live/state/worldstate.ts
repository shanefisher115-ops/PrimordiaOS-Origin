const realmStateMap = new Map();

export function applySignalsToWorldstate(signals) {
    for (const sig of signals) {
        const payload = sig.payload || {};

        const existing = realmStateMap.get(sig.realm) || {
            realm: sig.realm,
            lastUpdated: null,
            load: 0,
            entropy: 0,
            pressure: 0
        };

        const updated = {
            realm: existing.realm,
            lastUpdated: new Date(),
            load: existing.load * 0.6 + (payload.energy || 0) * 0.4,
            entropy: existing.entropy * 0.9 + (payload.turbulence || 0) * 0.1,
            pressure: existing.pressure * 0.7 + (payload.pressure || 0) * 0.3
        };

        realmStateMap.set(sig.realm, updated);
    }
}

export function getWorldstateSnapshot() {
    return Array.from(realmStateMap.values());
}
