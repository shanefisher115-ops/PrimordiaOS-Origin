// ============================================================
//   REALMBUS SERVER — WebSocket Gateway for PrimordiaOS
// ============================================================
//
//   The central nervous system. All realms connect here.
//   Handles:
//     - WebSocket connections from realms and browser clients
//     - Registration handshake
//     - Intent-based message routing
//     - Heartbeat monitoring
//     - Broadcast fan-out
//     - Kill switch enforcement
//     - Audit logging
//
//   Port: 3100 (configurable via REALMBUS_PORT env)
//

import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import {
  type RealmMessage,
  type RealmRegistration,
  deserializeMessage,
  serializeMessage,
  createResponse,
  createEvent,
  createHeartbeat,
  PROTOCOL_VERSION,
  BROADCAST_TARGET,
} from './protocol.js';
import { RealmRegistry } from './registry.js';
import { RealmRouter } from './router.js';
import { AuditLogger } from './audit.js';

// ─── Configuration ──────────────────────────────────────────

export interface RealmBusConfig {
  port: number;
  heartbeatIntervalMs: number;
  staleTimeoutMs: number;
  maxAuditEntries: number;
}

const DEFAULT_CONFIG: RealmBusConfig = {
  port: parseInt(process.env.REALMBUS_PORT ?? '3100', 10),
  heartbeatIntervalMs: 5_000,
  staleTimeoutMs: 30_000,
  maxAuditEntries: 10_000,
};

// ─── Connection Tracking ────────────────────────────────────

interface RealmConnection {
  ws: WebSocket;
  realmName: string;
  connectedAt: number;
  isAlive: boolean;
}

// ─── Logging ────────────────────────────────────────────────

function logBus(message: string, data?: unknown): void {
  const timestamp = new Date().toISOString().slice(11, 23);
  console.log(`\x1b[38;2;39;216;255m◆ [REALMBUS ${timestamp}] ${message}\x1b[0m`);
  if (data) console.log(data);
}

function logWarn(message: string, data?: unknown): void {
  const timestamp = new Date().toISOString().slice(11, 23);
  console.log(`\x1b[38;2;255;159;67m◇ [REALMBUS ${timestamp}] ${message}\x1b[0m`);
  if (data) console.log(data);
}

function logError(message: string, data?: unknown): void {
  const timestamp = new Date().toISOString().slice(11, 23);
  console.error(`\x1b[38;2;255;56;92m✖ [REALMBUS ${timestamp}] ${message}\x1b[0m`);
  if (data) console.error(data);
}

// ─── RealmBus Server ────────────────────────────────────────

export class RealmBusServer {
  private wss: WebSocketServer | null = null;
  private connections: Map<string, RealmConnection> = new Map();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private staleCheckTimer: ReturnType<typeof setInterval> | null = null;

  readonly registry: RealmRegistry;
  readonly router: RealmRouter;
  readonly audit: AuditLogger;
  readonly config: RealmBusConfig;

  constructor(config?: Partial<RealmBusConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registry = new RealmRegistry();
    this.router = new RealmRouter(this.registry);
    this.audit = new AuditLogger(this.config.maxAuditEntries);
  }

  // ── Start the Server ────────────────────────────────────

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port: this.config.port });

        this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));

        this.wss.on('listening', () => {
          logBus(`Gateway online on port ${this.config.port}`);
          logBus(`Protocol version: ${PROTOCOL_VERSION}`);
          this.startHeartbeatLoop();
          this.startStaleCheck();
          resolve();
        });

        this.wss.on('error', (err) => {
          logError('Server error', err);
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  // ── Stop the Server ─────────────────────────────────────

  stop(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.staleCheckTimer) clearInterval(this.staleCheckTimer);

    // Close all connections
    for (const conn of this.connections.values()) {
      conn.ws.close(1000, 'Server shutting down');
    }
    this.connections.clear();

    this.wss?.close(() => {
      logBus('Gateway offline');
    });
  }

  // ── Handle New Connection ───────────────────────────────

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const remoteAddr = req.socket.remoteAddress ?? 'unknown';
    logBus(`New connection from ${remoteAddr}`);

    // Temporary connection ID until registration
    const tempId = `unregistered-${Date.now()}`;
    const conn: RealmConnection = {
      ws,
      realmName: tempId,
      connectedAt: Date.now(),
      isAlive: true,
    };

    this.connections.set(tempId, conn);

    // Ping/pong for connection health
    ws.on('pong', () => {
      conn.isAlive = true;
    });

    ws.on('message', (data) => {
      try {
        const raw = data.toString();
        const message = deserializeMessage(raw);
        this.handleMessage(conn, message);
      } catch (err) {
        logError(`Invalid message from ${conn.realmName}`, err);
      }
    });

    ws.on('close', () => {
      logWarn(`Connection closed: ${conn.realmName}`);
      this.connections.delete(conn.realmName);
      // Also delete by temp ID if never registered
      this.connections.delete(tempId);
      this.registry.deregister(conn.realmName);

      // Notify all realms about disconnection
      this.broadcastEvent(
        'system',
        'realm.disconnected',
        { realmName: conn.realmName }
      );
    });

    ws.on('error', (err) => {
      logError(`Connection error from ${conn.realmName}`, err);
      this.registry.recordError(conn.realmName);
    });
  }

  // ── Handle Incoming Message ─────────────────────────────

  private handleMessage(conn: RealmConnection, message: RealmMessage): void {
    // Track realm path
    if (message.meta) {
      message.meta.realmPath = [...(message.meta.realmPath || []), 'gateway'];
    }

    // ── Registration Handshake ────────────────────────────
    if (message.type === 'register') {
      this.handleRegistration(conn, message);
      return;
    }

    // ── Heartbeat ─────────────────────────────────────────
    if (message.type === 'heartbeat') {
      this.registry.recordHeartbeat(conn.realmName);
      this.registry.recordMessageIn(conn.realmName);
      this.audit.log(message, true);
      return;
    }

    // ── Route the Message ─────────────────────────────────
    this.registry.recordMessageIn(conn.realmName);
    const routeResult = this.router.route(message);

    // Log to audit
    this.audit.log(
      message,
      routeResult.allowed,
      routeResult.violations.length > 0 ? routeResult.violations.join('; ') : undefined
    );

    if (!routeResult.allowed) {
      logWarn(`Blocked: ${message.intent} from ${message.source}`, routeResult.violations);

      // Send error response back to source
      const errorResponse = createResponse(
        message,
        'gateway',
        {
          error: 'ROUTING_BLOCKED',
          violations: routeResult.violations,
        },
        'BLOCKED'
      );

      this.sendToConnection(conn, errorResponse);
      return;
    }

    // ── Forward to Target Realms ──────────────────────────
    for (const targetRealm of routeResult.targetRealms) {
      const targetConn = this.connections.get(targetRealm);
      if (targetConn && targetConn.ws.readyState === WebSocket.OPEN) {
        this.sendToConnection(targetConn, message);
        this.registry.recordMessageOut(targetRealm);
      } else {
        logWarn(`Target realm "${targetRealm}" not connected — message queued (not implemented)`);
      }
    }
  }

  // ── Handle Registration ─────────────────────────────────

  private handleRegistration(conn: RealmConnection, message: RealmMessage): void {
    const registration = message.payload as RealmRegistration;

    if (!registration.realmName) {
      logError('Registration missing realmName');
      return;
    }

    // Remove temp connection entry
    const oldName = conn.realmName;
    this.connections.delete(oldName);

    // Update connection with real realm name
    conn.realmName = registration.realmName;
    this.connections.set(registration.realmName, conn);

    // Register in registry
    this.registry.register(registration.realmName, registration, conn.ws);

    logBus(`Realm registered: ${registration.realmName}`, {
      intents: registration.supportedIntents,
      capabilities: registration.capabilities.length,
    });

    // Send acknowledgment
    const ack = createResponse(
      message,
      'gateway',
      {
        accepted: true,
        protocolVersion: PROTOCOL_VERSION,
        connectedRealms: this.registry.getRealmNames(),
        allIntents: this.registry.getAllIntents(),
      },
      'OK'
    );
    this.sendToConnection(conn, ack);

    // Audit the registration
    this.audit.log(message, true);

    // Notify all other realms about new connection
    this.broadcastEvent(
      'system',
      'realm.connected',
      {
        realmName: registration.realmName,
        supportedIntents: registration.supportedIntents,
      }
    );
  }

  // ── Send to Connection ──────────────────────────────────

  private sendToConnection(conn: RealmConnection, message: RealmMessage): void {
    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(serializeMessage(message));
    }
  }

  // ── Broadcast an Event ──────────────────────────────────

  private broadcastEvent(
    source: string,
    intent: string,
    payload: unknown
  ): void {
    const event = createEvent(source, intent, payload);

    for (const conn of this.connections.values()) {
      if (conn.realmName !== source && conn.ws.readyState === WebSocket.OPEN) {
        this.sendToConnection(conn, event);
      }
    }
  }

  // ── Heartbeat Loop ──────────────────────────────────────

  private startHeartbeatLoop(): void {
    this.heartbeatTimer = setInterval(() => {
      for (const conn of this.connections.values()) {
        if (!conn.isAlive) {
          logWarn(`Terminating unresponsive connection: ${conn.realmName}`);
          conn.ws.terminate();
          this.connections.delete(conn.realmName);
          this.registry.deregister(conn.realmName);
          continue;
        }

        conn.isAlive = false;
        conn.ws.ping();
      }
    }, this.config.heartbeatIntervalMs);
  }

  // ── Stale Realm Check ───────────────────────────────────

  private startStaleCheck(): void {
    this.staleCheckTimer = setInterval(() => {
      const staleRealms = this.registry.getStaleRealms(this.config.staleTimeoutMs);

      for (const realm of staleRealms) {
        logWarn(`Stale realm detected: ${realm.realmName} (no heartbeat for ${this.config.staleTimeoutMs}ms)`);

        this.broadcastEvent('system', 'realm.stale', {
          realmName: realm.realmName,
          lastHeartbeat: realm.lastHeartbeat,
        });
      }
    }, this.config.staleTimeoutMs / 2);
  }

  // ── Public API: Get Snapshot ────────────────────────────

  getSnapshot() {
    return {
      registry: this.registry.snapshot(),
      killSwitch: this.router.getKillSwitchState(),
      audit: this.audit.getStats(),
      connections: this.connections.size,
    };
  }

  // ── Public API: Send message programmatically ──────────

  sendToRealm(realmName: string, message: RealmMessage): boolean {
    const conn = this.connections.get(realmName);
    if (!conn || conn.ws.readyState !== WebSocket.OPEN) return false;

    this.sendToConnection(conn, message);
    this.registry.recordMessageOut(realmName);
    return true;
  }
}

// ─── Standalone Entry Point ─────────────────────────────────

export async function startRealmBus(config?: Partial<RealmBusConfig>): Promise<RealmBusServer> {
  const server = new RealmBusServer(config);
  await server.start();
  return server;
}
