// ============================================================
//   REALMBUS REGISTRY — Active Realm Connection Tracking
// ============================================================
//
//   Tracks which realms are currently connected, their health,
//   and their declared capabilities. The single source of truth
//   for "what is alive in the constellation."
//
// ─── Registry Class ─────────────────────────────────────────
export class RealmRegistry {
    realms = new Map();
    listeners = new Set();
    // ── Register a Realm ────────────────────────────────────
    register(realmName, registration, connectionRef) {
        const existing = this.realms.get(realmName);
        if (existing) {
            // Re-registration: update connection reference, reset counters
            existing.registration = registration;
            existing.connectedAt = Date.now();
            existing.lastHeartbeat = Date.now();
            existing.connectionRef = connectionRef;
            existing.errorCount = 0;
            this.emit({ type: 'reconnected', realmName });
            return;
        }
        this.realms.set(realmName, {
            realmName,
            registration,
            connectedAt: Date.now(),
            lastHeartbeat: Date.now(),
            messageCountIn: 0,
            messageCountOut: 0,
            errorCount: 0,
            latencyMs: 0,
            connectionRef,
        });
        this.emit({ type: 'registered', realmName });
    }
    // ── Deregister a Realm ──────────────────────────────────
    deregister(realmName) {
        const removed = this.realms.delete(realmName);
        if (removed) {
            this.emit({ type: 'deregistered', realmName });
        }
        return removed;
    }
    // ── Get a Realm ─────────────────────────────────────────
    get(realmName) {
        return this.realms.get(realmName);
    }
    // ── Check if Realm Exists ───────────────────────────────
    has(realmName) {
        return this.realms.has(realmName);
    }
    // ── Get All Realm Names ─────────────────────────────────
    getRealmNames() {
        return Array.from(this.realms.keys());
    }
    // ── Get All Realms ──────────────────────────────────────
    getAll() {
        return Array.from(this.realms.values());
    }
    // ── Record Heartbeat ────────────────────────────────────
    recordHeartbeat(realmName, latencyMs) {
        const realm = this.realms.get(realmName);
        if (!realm)
            return;
        realm.lastHeartbeat = Date.now();
        if (latencyMs !== undefined) {
            realm.latencyMs = latencyMs;
        }
    }
    // ── Record Message In ───────────────────────────────────
    recordMessageIn(realmName) {
        const realm = this.realms.get(realmName);
        if (realm)
            realm.messageCountIn++;
    }
    // ── Record Message Out ──────────────────────────────────
    recordMessageOut(realmName) {
        const realm = this.realms.get(realmName);
        if (realm)
            realm.messageCountOut++;
    }
    // ── Record Error ────────────────────────────────────────
    recordError(realmName) {
        const realm = this.realms.get(realmName);
        if (realm)
            realm.errorCount++;
    }
    // ── Get Health for a Realm ──────────────────────────────
    getHealth(realmName) {
        const realm = this.realms.get(realmName);
        if (!realm)
            return null;
        const now = Date.now();
        const heartbeatAge = now - realm.lastHeartbeat;
        let state;
        if (heartbeatAge < 10_000) {
            state = 'online';
        }
        else if (heartbeatAge < 30_000) {
            state = 'degraded';
        }
        else {
            state = 'offline';
        }
        return {
            realmName: realm.realmName,
            connected: state !== 'offline',
            latencyMs: realm.latencyMs,
            lastHeartbeat: realm.lastHeartbeat,
            uptimeMs: now - realm.connectedAt,
            messageCountIn: realm.messageCountIn,
            messageCountOut: realm.messageCountOut,
            errorCount: realm.errorCount,
            state,
            supportedIntents: realm.registration.supportedIntents,
        };
    }
    // ── Get All Health ──────────────────────────────────────
    getAllHealth() {
        return this.getRealmNames()
            .map((name) => this.getHealth(name))
            .filter((h) => h !== null);
    }
    // ── Find Realm by Intent ────────────────────────────────
    //
    //    Given an intent like 'cloud.gemini.generate', find which
    //    realm handles it by matching against supportedIntents.
    //
    findRealmForIntent(intent) {
        for (const realm of this.realms.values()) {
            // Exact match
            if (realm.registration.supportedIntents.includes(intent)) {
                return realm;
            }
            // Namespace prefix match: 'cloud.*' matches 'cloud.gemini.generate'
            for (const supported of realm.registration.supportedIntents) {
                if (supported.endsWith('.*')) {
                    const prefix = supported.slice(0, -2);
                    if (intent.startsWith(prefix + '.')) {
                        return realm;
                    }
                }
            }
        }
        return null;
    }
    // ── Get All Supported Intents ───────────────────────────
    getAllIntents() {
        const intents = [];
        for (const realm of this.realms.values()) {
            for (const intent of realm.registration.supportedIntents) {
                intents.push({ intent, realmName: realm.realmName });
            }
        }
        return intents;
    }
    // ── Staleness Check ─────────────────────────────────────
    //
    //    Returns realms that haven't sent a heartbeat within
    //    the timeout threshold.
    //
    getStaleRealms(timeoutMs = 30_000) {
        const now = Date.now();
        return this.getAll().filter((realm) => now - realm.lastHeartbeat > timeoutMs);
    }
    // ── Event Subscription ─────────────────────────────────
    onChange(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    emit(event) {
        for (const listener of this.listeners) {
            try {
                listener(event);
            }
            catch (err) {
                console.error('[REGISTRY] Listener error:', err);
            }
        }
    }
    // ── Snapshot (for serialization / UI) ───────────────────
    snapshot() {
        return {
            realms: this.getAllHealth(),
            intents: this.getAllIntents(),
            timestamp: Date.now(),
        };
    }
}
