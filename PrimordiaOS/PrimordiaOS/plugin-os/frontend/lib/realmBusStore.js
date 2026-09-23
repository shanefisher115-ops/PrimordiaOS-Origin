"use strict";
// ============================================================
//   REALMBUS STORE — Zustand State for God Console
// ============================================================
//
//   Reactive state store that bridges the RealmBusClient
//   to React components. All UI components read from this
//   store instead of managing their own WebSocket state.
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRealmBusStore = void 0;
const zustand_1 = require("zustand");
const realmBusClient_1 = require("./realmBusClient");
// ─── Store Implementation ───────────────────────────────────
exports.useRealmBusStore = (0, zustand_1.create)((set, get) => {
    let client = null;
    let unsubscribeAll = null;
    let unsubscribeEvents = null;
    return {
        // Initial state
        connectionState: 'disconnected',
        reconnectAttempt: 0,
        realmHealth: {},
        connectedRealms: [],
        allIntents: [],
        events: [],
        maxEvents: 200,
        killSwitchLevel: 0,
        killSwitchReason: null,
        // ── Connect ───────────────────────────────────────────
        connect: async (url) => {
            client = (0, realmBusClient_1.getRealmBusClient)();
            // Listen to client events
            unsubscribeEvents = client.onEvent((event) => {
                switch (event.type) {
                    case 'connected':
                        set({
                            connectionState: 'connected',
                            reconnectAttempt: 0,
                        });
                        // Refresh intents after connection
                        setTimeout(() => {
                            if (client) {
                                set({ allIntents: client.getAllIntents() });
                            }
                        }, 500);
                        break;
                    case 'disconnected':
                        set({ connectionState: 'disconnected' });
                        break;
                    case 'reconnecting':
                        set({
                            connectionState: 'reconnecting',
                            reconnectAttempt: event.attempt,
                        });
                        break;
                    case 'error':
                        console.error('[RealmBusStore] Error:', event.error);
                        break;
                }
            });
            // Subscribe to all messages for the event stream
            unsubscribeAll = client.subscribeAll((message) => {
                const state = get();
                // Update event stream
                const newEvents = [...state.events, message];
                if (newEvents.length > state.maxEvents) {
                    newEvents.splice(0, newEvents.length - state.maxEvents);
                }
                // Update realm health from heartbeats
                const newHealth = { ...state.realmHealth };
                if (message.type === 'heartbeat' || message.type === 'event') {
                    const existing = newHealth[message.source];
                    if (existing) {
                        newHealth[message.source] = {
                            ...existing,
                            lastHeartbeat: message.timestamp,
                            state: 'online',
                        };
                    }
                    else {
                        newHealth[message.source] = {
                            realmName: message.source,
                            connected: true,
                            latencyMs: 0,
                            lastHeartbeat: message.timestamp,
                            uptimeMs: 0,
                            messageCountIn: 0,
                            messageCountOut: 0,
                            errorCount: 0,
                            state: 'online',
                            supportedIntents: [],
                        };
                    }
                }
                // Track realm connect/disconnect events
                let connectedRealms = state.connectedRealms;
                if (message.intent === 'realm.connected') {
                    const p = message.payload;
                    if (p.realmName && !connectedRealms.includes(p.realmName)) {
                        connectedRealms = [...connectedRealms, p.realmName];
                    }
                }
                else if (message.intent === 'realm.disconnected') {
                    const p = message.payload;
                    if (p.realmName) {
                        connectedRealms = connectedRealms.filter((r) => r !== p.realmName);
                    }
                }
                set({
                    events: newEvents,
                    realmHealth: newHealth,
                    connectedRealms,
                });
            });
            // Connect
            try {
                set({ connectionState: 'connecting' });
                await client.connect(url);
            }
            catch (err) {
                set({ connectionState: 'disconnected' });
                throw err;
            }
        },
        // ── Disconnect ────────────────────────────────────────
        disconnect: () => {
            if (unsubscribeAll)
                unsubscribeAll();
            if (unsubscribeEvents)
                unsubscribeEvents();
            if (client)
                client.disconnect();
            set({
                connectionState: 'disconnected',
                reconnectAttempt: 0,
            });
        },
        // ── Send Command ──────────────────────────────────────
        sendCommand: async (target, intent, payload, options) => {
            if (!client || get().connectionState !== 'connected') {
                throw new Error('Not connected to RealmBus');
            }
            return client.command(target, intent, payload, options);
        },
        // ── Clear Events ──────────────────────────────────────
        clearEvents: () => {
            set({ events: [] });
        },
        // ── Kill Switch ───────────────────────────────────────
        activateKillSwitch: async (level, reason) => {
            const state = get();
            if (state.connectionState !== 'connected')
                return;
            try {
                await state.sendCommand('gateway', 'system.killSwitch.activate', {
                    level,
                    reason,
                    activatedBy: 'browser-operator',
                });
                set({ killSwitchLevel: level, killSwitchReason: reason });
            }
            catch (err) {
                console.error('[RealmBusStore] Kill switch activation failed:', err);
            }
        },
        deactivateKillSwitch: async () => {
            const state = get();
            if (state.connectionState !== 'connected')
                return;
            try {
                await state.sendCommand('gateway', 'system.killSwitch.deactivate', {});
                set({ killSwitchLevel: 0, killSwitchReason: null });
            }
            catch (err) {
                console.error('[RealmBusStore] Kill switch deactivation failed:', err);
            }
        },
    };
});
