// ======================================================
// PRIMORDIAOS — EVENT BUS
// ======================================================
// Responsibilities:
// - Sovereign event routing
// - Realm-aware broadcasting
// - Agent-level subscriptions
// - System-wide event propagation
// - Replay-safe event logging
// ======================================================

export interface EventPayload {
    type: string;
    data: any;
    timestamp: number;
}

export type EventCallback = (payload: EventPayload) => void;

export class EventBus {
    private subscribers: Map<string, EventCallback[]> = new Map();
    private eventLog: EventPayload[] = [];

    constructor() {}

    // ------------------------------------------------------
    // SUBSCRIBE TO EVENT TYPE
    // ------------------------------------------------------
    subscribe(eventType: string, callback: EventCallback) {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, []);
        }
        this.subscribers.get(eventType)!.push(callback);
    }

    // ------------------------------------------------------
    // EMIT EVENT
    // ------------------------------------------------------
    emit(eventType: string, data: any) {
        const payload: EventPayload = {
            type: eventType,
            data,
            timestamp: Date.now()
        };

        // Log event for deterministic replay
        this.eventLog.push(payload);

        // Broadcast to subscribers
        const subs = this.subscribers.get(eventType);
        if (subs) {
            subs.forEach(cb => cb(payload));
        }
    }

    // ------------------------------------------------------
    // GET EVENT LOG (FOR REPLAY ENGINE)
    // ------------------------------------------------------
    getLog(): EventPayload[] {
        return [...this.eventLog];
    }

    // ------------------------------------------------------
    // CLEAR EVENT LOG (REPLAY MODE)
    // ------------------------------------------------------
    clearLog() {
        this.eventLog = [];
    }
}
