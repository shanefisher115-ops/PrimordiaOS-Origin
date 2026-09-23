// ============================================================
//   REALMBUS PROTOCOL — Wire Types for PrimordiaOS Multirealm
// ============================================================
//
//   Every message on the RealmBus uses a single envelope.
//   Typed, serializable, shared between server and client.
//
export const BROADCAST_TARGET = '*';
// ─── Serialization ──────────────────────────────────────────
export function serializeMessage(msg) {
    return JSON.stringify(msg);
}
export function deserializeMessage(raw) {
    const parsed = JSON.parse(raw);
    // Minimal validation
    if (!parsed.id || !parsed.type || !parsed.source || !parsed.intent) {
        throw new Error(`Invalid RealmMessage: missing required fields. Got keys: ${Object.keys(parsed).join(', ')}`);
    }
    return parsed;
}
// ─── Message Factory ────────────────────────────────────────
let _seq = 0;
export function generateMessageId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `rm-${crypto.randomUUID().slice(0, 12)}`;
    }
    const hex = () => Math.random().toString(16).slice(2, 6);
    return `rm-${hex()}-${hex()}-${hex()}`;
}
export function createMessage(type, source, target, intent, payload, options) {
    _seq++;
    return {
        id: generateMessageId(),
        type,
        source,
        target,
        intent,
        payload,
        correlationId: options?.correlationId,
        timestamp: Date.now(),
        ttl: options?.ttl ?? 30_000,
        meta: {
            traceId: options?.traceId ?? generateMessageId(),
            realmPath: [source],
            priority: options?.priority ?? 'normal',
            seq: _seq,
        },
    };
}
// ─── Command/Response Helpers ───────────────────────────────
export function createCommand(source, target, intent, payload, options) {
    return createMessage('command', source, target, intent, payload, options);
}
export function createResponse(originalMessage, source, payload, status = 'OK') {
    return createMessage('response', source, originalMessage.source, originalMessage.intent, { ...payload, status }, {
        correlationId: originalMessage.id,
        traceId: originalMessage.meta?.traceId,
        priority: originalMessage.meta?.priority,
    });
}
export function createEvent(source, intent, payload, options) {
    return createMessage('event', source, BROADCAST_TARGET, intent, payload, options);
}
export function createHeartbeat(source) {
    return createMessage('heartbeat', source, BROADCAST_TARGET, 'system.heartbeat', {
        uptimeMs: Date.now(),
    });
}
// ─── Protocol Version ───────────────────────────────────────
export const PROTOCOL_VERSION = '1.0.0';
// ─── Kill Switch Levels ─────────────────────────────────────
export var KillSwitchLevel;
(function (KillSwitchLevel) {
    /** No restrictions */
    KillSwitchLevel[KillSwitchLevel["NONE"] = 0] = "NONE";
    /** Kill single agent */
    KillSwitchLevel[KillSwitchLevel["AGENT"] = 1] = "AGENT";
    /** Kill entire swarm */
    KillSwitchLevel[KillSwitchLevel["SWARM"] = 2] = "SWARM";
    /** Disconnect one realm */
    KillSwitchLevel[KillSwitchLevel["REALM"] = 3] = "REALM";
    /** Block all destructive intents */
    KillSwitchLevel[KillSwitchLevel["SAFE_MODE"] = 4] = "SAFE_MODE";
    /** Halt everything */
    KillSwitchLevel[KillSwitchLevel["EMERGENCY_HALT"] = 5] = "EMERGENCY_HALT";
})(KillSwitchLevel || (KillSwitchLevel = {}));
