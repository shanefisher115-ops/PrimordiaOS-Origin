// ============================================================
//   REALMBUS CLIENT — Browser-Side WebSocket Client
// ============================================================
//
//   Connects the browser realm (God Console) to the RealmBus
//   gateway. Provides:
//     - Command/Response (send command, await response)
//     - Event Subscription (real-time realm events)
//     - Realm Health Monitoring
//     - Automatic reconnection
//
//   This replaces the fragmented HTTP polling and ephemeral
//   WebSocket connections in the existing cockpit.
//

import type {
  RealmMessage,
  RealmHealth,
  RealmRegistration,
  MessagePriority,
  MessageType,
  RealmRegistrySnapshot,
  KillSwitchState,
} from '../../realmbus/protocol';

// Re-create message factories for the browser (no Node imports)

function generateClientMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `rm-${crypto.randomUUID().slice(0, 12)}`;
  }
  const hex = () => Math.random().toString(16).slice(2, 6);
  return `rm-${hex()}-${hex()}-${hex()}`;
}

// ─── Connection State ───────────────────────────────────────

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// ─── Pending Request ────────────────────────────────────────

interface PendingRequest {
  resolve: (msg: RealmMessage) => void;
  reject: (err: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  sentAt: number;
}

// ─── Subscription ───────────────────────────────────────────

interface Subscription {
  id: string;
  filter: SubscriptionFilter;
  handler: (msg: RealmMessage) => void;
}

export interface SubscriptionFilter {
  source?: string;
  type?: MessageType;
  intent?: string;
}

// ─── Client Events ──────────────────────────────────────────

export type ClientEvent =
  | { type: 'connected' }
  | { type: 'disconnected'; reason: string }
  | { type: 'reconnecting'; attempt: number }
  | { type: 'message'; message: RealmMessage }
  | { type: 'realmUpdate'; snapshot: RealmRegistrySnapshot }
  | { type: 'error'; error: Error };

// ─── RealmBus Client ────────────────────────────────────────

export class RealmBusClient {
  private ws: WebSocket | null = null;
  private pending: Map<string, PendingRequest> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private eventListeners: Set<(event: ClientEvent) => void> = new Set();

  private _state: ConnectionState = 'disconnected';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectBaseDelayMs: number = 1000;

  private realmHealth: Map<string, RealmHealth> = new Map();
  private allIntents: { intent: string; realmName: string }[] = [];

  private url: string = '';

  // ── Connection State ────────────────────────────────────

  get state(): ConnectionState {
    return this._state;
  }

  // ── Connect ─────────────────────────────────────────────

  connect(url: string = 'ws://localhost:3100'): Promise<void> {
    this.url = url;
    this._state = 'connecting';

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this._state = 'connected';
          this.reconnectAttempts = 0;
          console.log('[RealmBusClient] Connected to gateway');

          // Register the browser realm
          this.sendRegistration();

          this.emit({ type: 'connected' });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: RealmMessage = JSON.parse(event.data as string);
            this.handleMessage(message);
          } catch (err) {
            console.error('[RealmBusClient] Invalid message:', err);
          }
        };

        this.ws.onclose = (event) => {
          this._state = 'disconnected';
          console.log('[RealmBusClient] Disconnected:', event.reason || 'unknown');

          this.emit({ type: 'disconnected', reason: event.reason || 'Connection closed' });

          // Reject all pending requests
          for (const [id, pending] of this.pending) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('Connection closed'));
          }
          this.pending.clear();

          // Attempt reconnection
          this.scheduleReconnect();
        };

        this.ws.onerror = (event) => {
          console.error('[RealmBusClient] WebSocket error');
          this.emit({ type: 'error', error: new Error('WebSocket error') });

          if (this._state === 'connecting') {
            reject(new Error('Failed to connect to RealmBus gateway'));
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  // ── Disconnect ──────────────────────────────────────────

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this._state = 'disconnected';
  }

  // ── Send Command & Await Response ───────────────────────

  command<TPayload = unknown, TResponse = unknown>(
    target: string,
    intent: string,
    payload: TPayload,
    options?: {
      timeoutMs?: number;
      priority?: MessagePriority;
      traceId?: string;
    }
  ): Promise<RealmMessage<TResponse>> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this._state !== 'connected') {
        reject(new Error('Not connected to RealmBus'));
        return;
      }

      const id = generateClientMessageId();
      const timeoutMs = options?.timeoutMs ?? 30_000;

      const message: RealmMessage<TPayload> = {
        id,
        type: 'command',
        source: 'browser',
        target,
        intent,
        payload,
        timestamp: Date.now(),
        ttl: timeoutMs,
        meta: {
          traceId: options?.traceId ?? generateClientMessageId(),
          realmPath: ['browser'],
          priority: options?.priority ?? 'normal',
        },
      };

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Command timeout after ${timeoutMs}ms: ${intent}`));
      }, timeoutMs);

      // Store pending request
      this.pending.set(id, {
        resolve: resolve as (msg: RealmMessage) => void,
        reject,
        timeout,
        sentAt: Date.now(),
      });

      // Send
      this.ws.send(JSON.stringify(message));
    });
  }

  // ── Subscribe to Events ─────────────────────────────────

  subscribe(
    filter: SubscriptionFilter,
    handler: (msg: RealmMessage) => void
  ): () => void {
    const id = generateClientMessageId();

    this.subscriptions.set(id, { id, filter, handler });

    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(id);
    };
  }

  // ── Subscribe to All Messages ───────────────────────────

  subscribeAll(handler: (msg: RealmMessage) => void): () => void {
    return this.subscribe({}, handler);
  }

  // ── Client Event Listener ───────────────────────────────

  onEvent(listener: (event: ClientEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  // ── Get Realm Health ────────────────────────────────────

  getRealmHealth(): Map<string, RealmHealth> {
    return new Map(this.realmHealth);
  }

  // ── Get All Known Intents ───────────────────────────────

  getAllIntents(): { intent: string; realmName: string }[] {
    return [...this.allIntents];
  }

  // ── Internal: Handle Incoming Message ───────────────────

  private handleMessage(message: RealmMessage): void {
    // Emit raw message event
    this.emit({ type: 'message', message });

    // ── Response: resolve pending command ──────────────────
    if (message.type === 'response' && message.correlationId) {
      const pending = this.pending.get(message.correlationId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pending.delete(message.correlationId);
        pending.resolve(message);
        return;
      }
    }

    // ── Registration Ack: update intent catalog ───────────
    if (message.type === 'response' && message.intent === 'system.register') {
      const payload = message.payload as {
        connectedRealms?: string[];
        allIntents?: { intent: string; realmName: string }[];
      };
      if (payload.allIntents) {
        this.allIntents = payload.allIntents;
      }
    }

    // ── Realm Events: track health updates ────────────────
    if (message.intent === 'realm.connected' || message.intent === 'realm.disconnected') {
      // Request a fresh snapshot
      this.requestSnapshot();
    }

    // ── Heartbeat: update health map ──────────────────────
    if (message.type === 'heartbeat') {
      const existing = this.realmHealth.get(message.source);
      if (existing) {
        existing.lastHeartbeat = message.timestamp;
        existing.state = 'online';
      } else {
        this.realmHealth.set(message.source, {
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
        });
      }
    }

    // ── Notify Subscriptions ──────────────────────────────
    for (const sub of this.subscriptions.values()) {
      if (this.matchesFilter(message, sub.filter)) {
        try {
          sub.handler(message);
        } catch (err) {
          console.error('[RealmBusClient] Subscription handler error:', err);
        }
      }
    }
  }

  // ── Filter Matching ─────────────────────────────────────

  private matchesFilter(message: RealmMessage, filter: SubscriptionFilter): boolean {
    if (filter.source && message.source !== filter.source) return false;
    if (filter.type && message.type !== filter.type) return false;
    if (filter.intent && !message.intent.includes(filter.intent)) return false;
    return true;
  }

  // ── Send Registration ───────────────────────────────────

  private sendRegistration(): void {
    if (!this.ws) return;

    const registration: RealmRegistration = {
      realmName: 'browser',
      capabilities: [
        {
          namespace: 'browser',
          description: 'PrimordiaOS God Console — operator interface',
          supportsResponse: false,
        },
      ],
      supportedIntents: ['browser.*'],
      protocolVersion: '1.0.0',
    };

    const message: RealmMessage = {
      id: generateClientMessageId(),
      type: 'register',
      source: 'browser',
      target: 'gateway',
      intent: 'system.register',
      payload: registration,
      timestamp: Date.now(),
      meta: {
        traceId: generateClientMessageId(),
        realmPath: ['browser'],
        priority: 'high',
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  // ── Request Snapshot ─────────────────────────────────────

  private async requestSnapshot(): Promise<void> {
    try {
      const response = await this.command('system', 'system.status', {});
      // The snapshot will come back and update health
    } catch {
      // Ignore — snapshot is best-effort
    }
  }

  // ── Reconnection Logic ──────────────────────────────────

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[RealmBusClient] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectBaseDelayMs * Math.pow(2, this.reconnectAttempts - 1),
      30_000
    );

    this._state = 'reconnecting';
    this.emit({ type: 'reconnecting', attempt: this.reconnectAttempts });

    console.log(`[RealmBusClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect(this.url).catch(() => {
        // Will trigger onclose → scheduleReconnect again
      });
    }, delay);
  }

  // ── Emit Client Event ───────────────────────────────────

  private emit(event: ClientEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[RealmBusClient] Event listener error:', err);
      }
    }
  }
}

// ─── Singleton Instance ─────────────────────────────────────

let _instance: RealmBusClient | null = null;

export function getRealmBusClient(): RealmBusClient {
  if (!_instance) {
    _instance = new RealmBusClient();
  }
  return _instance;
}

// ─── Type Re-exports for UI Convenience ─────────────────────

export type {
  RealmMessage,
  RealmHealth,
  MessageType,
  MessagePriority,
  RealmRegistrySnapshot,
  KillSwitchState,
} from '../../realmbus/protocol';
