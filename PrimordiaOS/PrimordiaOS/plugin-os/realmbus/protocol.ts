// ============================================================
//   REALMBUS PROTOCOL — Wire Types for PrimordiaOS Multirealm
// ============================================================
//
//   Every message on the RealmBus uses a single envelope.
//   Typed, serializable, shared between server and client.
//

// ─── Realm Identifiers ──────────────────────────────────────

export type RealmName =
  | 'browser'
  | 'system'
  | 'cloud'
  | 'simulation'
  | `agent:${string}`;

export const BROADCAST_TARGET = '*' as const;

// ─── Message Types ──────────────────────────────────────────

export type MessageType =
  | 'command'      // Request execution on a target realm
  | 'response'     // Reply to a command (linked by correlationId)
  | 'event'        // One-way notification from a realm
  | 'heartbeat'    // Periodic health signal
  | 'error'        // Error notification
  | 'register'     // Realm registration handshake
  | 'deregister';  // Realm disconnection

export type MessagePriority = 'low' | 'normal' | 'high' | 'critical';

export type MessageStatus = 'OK' | 'ERROR' | 'BLOCKED' | 'TIMEOUT' | 'PENDING';

// ─── Core Message Envelope ──────────────────────────────────

export interface RealmMessage<T = unknown> {
  /** Unique message ID (UUID v4 prefix) */
  id: string;

  /** Discriminator for message handling */
  type: MessageType;

  /** Realm that originated this message */
  source: string;

  /** Target realm, or '*' for broadcast */
  target: string;

  /** Namespaced intent: 'cloud.gemini.generate', 'agent.spawn', etc. */
  intent: string;

  /** Typed payload — schema depends on intent */
  payload: T;

  /** Links response to the original command */
  correlationId?: string;

  /** Unix timestamp (ms) */
  timestamp: number;

  /** Max age before automatic discard (ms). Default: 30000 */
  ttl?: number;

  /** Optional metadata for tracing and routing */
  meta?: MessageMeta;
}

export interface MessageMeta {
  /** PURL trace chain identifier */
  traceId: string;

  /** Ordered list of realms this message has traversed */
  realmPath: string[];

  /** Routing priority */
  priority: MessagePriority;

  /** Sequence number for ordering within a connection */
  seq?: number;
}

// ─── Registration Handshake ─────────────────────────────────

export interface RealmRegistration {
  /** Name of the realm registering */
  realmName: string;

  /** Capabilities this realm exposes */
  capabilities: RealmCapability[];

  /** Intents this realm can handle */
  supportedIntents: string[];

  /** Protocol version for forward compatibility */
  protocolVersion: string;
}

export interface RealmCapability {
  /** Intent namespace prefix (e.g. 'cloud.gemini') */
  namespace: string;

  /** Human-readable description */
  description: string;

  /** Whether this capability supports request/response */
  supportsResponse: boolean;
}

// ─── Realm Health ───────────────────────────────────────────

export interface RealmHealth {
  realmName: string;
  connected: boolean;
  latencyMs: number;
  lastHeartbeat: number;
  uptimeMs: number;
  messageCountIn: number;
  messageCountOut: number;
  errorCount: number;
  state: 'online' | 'degraded' | 'offline' | 'unknown';
  supportedIntents: string[];
}

// ─── Realm Connector Interface ──────────────────────────────

export interface RealmConnector {
  readonly realmName: string;

  /** Establish connection to the realm */
  connect(): Promise<void>;

  /** Gracefully disconnect */
  disconnect(): Promise<void>;

  /** Send a message to this realm */
  send(message: RealmMessage): Promise<void>;

  /** Register handler for incoming messages */
  onMessage(handler: (message: RealmMessage) => void): void;

  /** Get current health status */
  getHealth(): RealmHealth;

  /** Check if connected */
  isConnected(): boolean;
}

// ─── Serialization ──────────────────────────────────────────

export function serializeMessage(msg: RealmMessage): string {
  return JSON.stringify(msg);
}

export function deserializeMessage(raw: string): RealmMessage {
  const parsed = JSON.parse(raw);

  // Minimal validation
  if (!parsed.id || !parsed.type || !parsed.source || !parsed.intent) {
    throw new Error(
      `Invalid RealmMessage: missing required fields. Got keys: ${Object.keys(parsed).join(', ')}`
    );
  }

  return parsed as RealmMessage;
}

// ─── Message Factory ────────────────────────────────────────

let _seq = 0;

export function generateMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `rm-${crypto.randomUUID().slice(0, 12)}`;
  }
  const hex = () => Math.random().toString(16).slice(2, 6);
  return `rm-${hex()}-${hex()}-${hex()}`;
}

export function createMessage<T = unknown>(
  type: MessageType,
  source: string,
  target: string,
  intent: string,
  payload: T,
  options?: {
    correlationId?: string;
    ttl?: number;
    traceId?: string;
    priority?: MessagePriority;
  }
): RealmMessage<T> {
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

export function createCommand<T = unknown>(
  source: string,
  target: string,
  intent: string,
  payload: T,
  options?: { traceId?: string; priority?: MessagePriority; ttl?: number }
): RealmMessage<T> {
  return createMessage('command', source, target, intent, payload, options);
}

export function createResponse<T = unknown>(
  originalMessage: RealmMessage,
  source: string,
  payload: T,
  status: MessageStatus = 'OK'
): RealmMessage<T & { status: MessageStatus }> {
  return createMessage(
    'response',
    source,
    originalMessage.source,
    originalMessage.intent,
    { ...payload, status } as T & { status: MessageStatus },
    {
      correlationId: originalMessage.id,
      traceId: originalMessage.meta?.traceId,
      priority: originalMessage.meta?.priority,
    }
  );
}

export function createEvent<T = unknown>(
  source: string,
  intent: string,
  payload: T,
  options?: { traceId?: string; priority?: MessagePriority }
): RealmMessage<T> {
  return createMessage('event', source, BROADCAST_TARGET, intent, payload, options);
}

export function createHeartbeat(source: string): RealmMessage<{ uptimeMs: number }> {
  return createMessage('heartbeat', source, BROADCAST_TARGET, 'system.heartbeat', {
    uptimeMs: Date.now(),
  });
}

// ─── Protocol Version ───────────────────────────────────────

export const PROTOCOL_VERSION = '1.0.0';

// ─── Kill Switch Levels ─────────────────────────────────────

export enum KillSwitchLevel {
  /** No restrictions */
  NONE = 0,
  /** Kill single agent */
  AGENT = 1,
  /** Kill entire swarm */
  SWARM = 2,
  /** Disconnect one realm */
  REALM = 3,
  /** Block all destructive intents */
  SAFE_MODE = 4,
  /** Halt everything */
  EMERGENCY_HALT = 5,
}

export interface KillSwitchState {
  level: KillSwitchLevel;
  activatedAt: number | null;
  activatedBy: string | null;
  reason: string | null;
  affectedRealms: string[];
  affectedAgents: string[];
}
