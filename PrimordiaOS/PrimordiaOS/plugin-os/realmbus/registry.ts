// ============================================================
//   REALMBUS REGISTRY — Active Realm Connection Tracking
// ============================================================
//
//   Tracks which realms are currently connected, their health,
//   and their declared capabilities. The single source of truth
//   for "what is alive in the constellation."
//

import type {
  RealmHealth,
  RealmRegistration,
  RealmCapability,
  RealmMessage,
} from './protocol.js';

// ─── Registered Realm Entry ─────────────────────────────────

export interface RegisteredRealm {
  realmName: string;
  registration: RealmRegistration;
  connectedAt: number;
  lastHeartbeat: number;
  messageCountIn: number;
  messageCountOut: number;
  errorCount: number;
  latencyMs: number;

  /** WebSocket or connector reference — opaque to the registry */
  connectionRef: unknown;
}

// ─── Registry Class ─────────────────────────────────────────

export class RealmRegistry {
  private realms: Map<string, RegisteredRealm> = new Map();
  private listeners: Set<(event: RegistryEvent) => void> = new Set();

  // ── Register a Realm ────────────────────────────────────

  register(
    realmName: string,
    registration: RealmRegistration,
    connectionRef: unknown
  ): void {
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

  deregister(realmName: string): boolean {
    const removed = this.realms.delete(realmName);
    if (removed) {
      this.emit({ type: 'deregistered', realmName });
    }
    return removed;
  }

  // ── Get a Realm ─────────────────────────────────────────

  get(realmName: string): RegisteredRealm | undefined {
    return this.realms.get(realmName);
  }

  // ── Check if Realm Exists ───────────────────────────────

  has(realmName: string): boolean {
    return this.realms.has(realmName);
  }

  // ── Get All Realm Names ─────────────────────────────────

  getRealmNames(): string[] {
    return Array.from(this.realms.keys());
  }

  // ── Get All Realms ──────────────────────────────────────

  getAll(): RegisteredRealm[] {
    return Array.from(this.realms.values());
  }

  // ── Record Heartbeat ────────────────────────────────────

  recordHeartbeat(realmName: string, latencyMs?: number): void {
    const realm = this.realms.get(realmName);
    if (!realm) return;

    realm.lastHeartbeat = Date.now();
    if (latencyMs !== undefined) {
      realm.latencyMs = latencyMs;
    }
  }

  // ── Record Message In ───────────────────────────────────

  recordMessageIn(realmName: string): void {
    const realm = this.realms.get(realmName);
    if (realm) realm.messageCountIn++;
  }

  // ── Record Message Out ──────────────────────────────────

  recordMessageOut(realmName: string): void {
    const realm = this.realms.get(realmName);
    if (realm) realm.messageCountOut++;
  }

  // ── Record Error ────────────────────────────────────────

  recordError(realmName: string): void {
    const realm = this.realms.get(realmName);
    if (realm) realm.errorCount++;
  }

  // ── Get Health for a Realm ──────────────────────────────

  getHealth(realmName: string): RealmHealth | null {
    const realm = this.realms.get(realmName);
    if (!realm) return null;

    const now = Date.now();
    const heartbeatAge = now - realm.lastHeartbeat;

    let state: RealmHealth['state'];
    if (heartbeatAge < 10_000) {
      state = 'online';
    } else if (heartbeatAge < 30_000) {
      state = 'degraded';
    } else {
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

  getAllHealth(): RealmHealth[] {
    return this.getRealmNames()
      .map((name) => this.getHealth(name))
      .filter((h): h is RealmHealth => h !== null);
  }

  // ── Find Realm by Intent ────────────────────────────────
  //
  //    Given an intent like 'cloud.gemini.generate', find which
  //    realm handles it by matching against supportedIntents.
  //

  findRealmForIntent(intent: string): RegisteredRealm | null {
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

  getAllIntents(): { intent: string; realmName: string }[] {
    const intents: { intent: string; realmName: string }[] = [];

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

  getStaleRealms(timeoutMs: number = 30_000): RegisteredRealm[] {
    const now = Date.now();
    return this.getAll().filter(
      (realm) => now - realm.lastHeartbeat > timeoutMs
    );
  }

  // ── Event Subscription ─────────────────────────────────

  onChange(listener: (event: RegistryEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: RegistryEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[REGISTRY] Listener error:', err);
      }
    }
  }

  // ── Snapshot (for serialization / UI) ───────────────────

  snapshot(): RealmRegistrySnapshot {
    return {
      realms: this.getAllHealth(),
      intents: this.getAllIntents(),
      timestamp: Date.now(),
    };
  }
}

// ─── Registry Events ────────────────────────────────────────

export interface RegistryEvent {
  type: 'registered' | 'deregistered' | 'reconnected';
  realmName: string;
}

// ─── Snapshot Type (for UI consumption) ─────────────────────

export interface RealmRegistrySnapshot {
  realms: RealmHealth[];
  intents: { intent: string; realmName: string }[];
  timestamp: number;
}
