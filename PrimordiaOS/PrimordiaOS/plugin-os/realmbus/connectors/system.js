// ============================================================
//   SYSTEM REALM CONNECTOR — Bridges to CommandBus
// ============================================================
//
//   Connects the RealmBus to the existing PrimordiaOS
//   CommandBus (command-bus/bus.ts), translating RealmMessages
//   into CommandBus.runCommand() calls and wrapping results.
//
import { createResponse, createHeartbeat, PROTOCOL_VERSION, } from '../protocol.js';
// ─── System Connector ───────────────────────────────────────
export class SystemConnector {
    commandBus;
    realmName = 'system';
    connected = false;
    connectedAt = 0;
    messageCountIn = 0;
    messageCountOut = 0;
    errorCount = 0;
    lastHeartbeat = 0;
    messageHandler = null;
    heartbeatTimer = null;
    /** Known system-level intents derived from CommandBus */
    systemIntents = [];
    constructor(commandBus = null) {
        this.commandBus = commandBus;
    }
    // ── Connect ─────────────────────────────────────────────
    async connect() {
        this.connected = true;
        this.connectedAt = Date.now();
        this.lastHeartbeat = Date.now();
        // Register known system intents
        this.systemIntents = [
            'system.status',
            'system.boot',
            'system.heartbeat',
        ];
        // If a CommandBus is provided, we could introspect it.
        // For now, we register intents known at build time.
        // Start heartbeat
        this.heartbeatTimer = setInterval(() => {
            this.lastHeartbeat = Date.now();
            if (this.messageHandler) {
                this.messageHandler(createHeartbeat(this.realmName));
            }
        }, 5000);
        console.log('[SYSTEM CONNECTOR] Connected to PrimordiaOS core');
    }
    // ── Disconnect ──────────────────────────────────────────
    async disconnect() {
        this.connected = false;
        if (this.heartbeatTimer)
            clearInterval(this.heartbeatTimer);
        console.log('[SYSTEM CONNECTOR] Disconnected');
    }
    // ── Send (handle incoming command from bus) ─────────────
    async send(message) {
        this.messageCountIn++;
        if (message.type === 'command') {
            try {
                let result;
                // Try CommandBus first
                if (this.commandBus) {
                    const cmd = this.commandBus.get(message.intent);
                    if (cmd) {
                        result = await this.commandBus.runCommand(message.intent);
                    }
                    else {
                        result = await this.handleBuiltinCommand(message);
                    }
                }
                else {
                    result = await this.handleBuiltinCommand(message);
                }
                // Send response back
                if (this.messageHandler) {
                    const response = createResponse(message, this.realmName, {
                        data: result,
                        executedBy: 'SystemConnector',
                    }, 'OK');
                    this.messageCountOut++;
                    this.messageHandler(response);
                }
            }
            catch (err) {
                this.errorCount++;
                if (this.messageHandler) {
                    const errorResponse = createResponse(message, this.realmName, {
                        error: err instanceof Error ? err.message : 'Unknown error',
                        executedBy: 'SystemConnector',
                    }, 'ERROR');
                    this.messageCountOut++;
                    this.messageHandler(errorResponse);
                }
            }
        }
    }
    // ── Built-in System Commands ────────────────────────────
    async handleBuiltinCommand(message) {
        switch (message.intent) {
            case 'system.status':
                return {
                    uptime: Date.now() - this.connectedAt,
                    connected: this.connected,
                    messageCountIn: this.messageCountIn,
                    messageCountOut: this.messageCountOut,
                    errorCount: this.errorCount,
                    commandBusAvailable: this.commandBus !== null,
                };
            case 'system.ping':
                return { pong: true, timestamp: Date.now() };
            default:
                throw new Error(`Unknown system intent: ${message.intent}`);
        }
    }
    // ── Message Handler ─────────────────────────────────────
    onMessage(handler) {
        this.messageHandler = handler;
    }
    // ── Health ──────────────────────────────────────────────
    getHealth() {
        return {
            realmName: this.realmName,
            connected: this.connected,
            latencyMs: 0, // Local — zero latency
            lastHeartbeat: this.lastHeartbeat,
            uptimeMs: this.connected ? Date.now() - this.connectedAt : 0,
            messageCountIn: this.messageCountIn,
            messageCountOut: this.messageCountOut,
            errorCount: this.errorCount,
            state: this.connected ? 'online' : 'offline',
            supportedIntents: this.systemIntents,
        };
    }
    isConnected() {
        return this.connected;
    }
    // ── Registration Payload ────────────────────────────────
    getRegistration() {
        return {
            realmName: this.realmName,
            capabilities: [
                {
                    namespace: 'system',
                    description: 'PrimordiaOS core system commands',
                    supportsResponse: true,
                },
            ],
            supportedIntents: [...this.systemIntents, 'system.*'],
            protocolVersion: PROTOCOL_VERSION,
        };
    }
}
