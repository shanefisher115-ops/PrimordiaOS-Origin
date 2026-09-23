// ============================================================
//   SYSTEM REALM CONNECTOR — Bridges to CommandBus
// ============================================================
//
//   Connects the RealmBus to the existing PrimordiaOS
//   CommandBus (command-bus/bus.ts), translating RealmMessages
//   into CommandBus.runCommand() calls and wrapping results.
//

import type {
  RealmMessage,
  RealmHealth,
  RealmConnector,
  RealmRegistration,
} from '../protocol.js';
import {
  createResponse,
  createHeartbeat,
  PROTOCOL_VERSION,
} from '../protocol.js';

// ─── Types ──────────────────────────────────────────────────

type CommandFn = () => Promise<unknown>;

interface CommandBusInterface {
  get(name: string): CommandFn | null;
  runCommand(name: string): Promise<unknown>;
  register(name: string, fn: CommandFn): void;
}

// ─── System Connector ───────────────────────────────────────

export class SystemConnector implements RealmConnector {
  readonly realmName = 'system';

  private connected = false;
  private connectedAt = 0;
  private messageCountIn = 0;
  private messageCountOut = 0;
  private errorCount = 0;
  private lastHeartbeat = 0;
  private messageHandler: ((msg: RealmMessage) => void) | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  /** Known system-level intents derived from CommandBus */
  private systemIntents: string[] = [];

  constructor(
    private commandBus: CommandBusInterface | null = null
  ) {}

  // ── Connect ─────────────────────────────────────────────

  async connect(): Promise<void> {
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

  async disconnect(): Promise<void> {
    this.connected = false;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    console.log('[SYSTEM CONNECTOR] Disconnected');
  }

  // ── Send (handle incoming command from bus) ─────────────

  async send(message: RealmMessage): Promise<void> {
    this.messageCountIn++;

    if (message.type === 'command') {
      try {
        let result: unknown;

        // Try CommandBus first
        if (this.commandBus) {
          const cmd = this.commandBus.get(message.intent);
          if (cmd) {
            result = await this.commandBus.runCommand(message.intent);
          } else {
            result = await this.handleBuiltinCommand(message);
          }
        } else {
          result = await this.handleBuiltinCommand(message);
        }

        // Send response back
        if (this.messageHandler) {
          const response = createResponse(
            message,
            this.realmName,
            {
              data: result,
              executedBy: 'SystemConnector',
            },
            'OK'
          );
          this.messageCountOut++;
          this.messageHandler(response);
        }
      } catch (err) {
        this.errorCount++;
        if (this.messageHandler) {
          const errorResponse = createResponse(
            message,
            this.realmName,
            {
              error: err instanceof Error ? err.message : 'Unknown error',
              executedBy: 'SystemConnector',
            },
            'ERROR'
          );
          this.messageCountOut++;
          this.messageHandler(errorResponse);
        }
      }
    }
  }

  // ── Built-in System Commands ────────────────────────────

  private async handleBuiltinCommand(message: RealmMessage): Promise<unknown> {
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

  onMessage(handler: (message: RealmMessage) => void): void {
    this.messageHandler = handler;
  }

  // ── Health ──────────────────────────────────────────────

  getHealth(): RealmHealth {
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

  isConnected(): boolean {
    return this.connected;
  }

  // ── Registration Payload ────────────────────────────────

  getRegistration(): RealmRegistration {
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
