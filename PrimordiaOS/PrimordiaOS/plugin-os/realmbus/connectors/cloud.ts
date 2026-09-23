// ============================================================
//   CLOUD REALM CONNECTOR — Cloudflare Workers / Gemini / AI
// ============================================================
//
//   Routes commands to external cloud services:
//     - Cloudflare Workers (via HTTP)
//     - Cloudflare AI Gateway
//     - Google Gemini API
//     - Custom REST endpoints
//
//   Each cloud service is a "sub-realm" addressed by intent
//   namespace: cloud.gemini.*, cloud.worker.*, cloud.ai.*, etc.
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

// ─── Cloud Endpoint Configuration ───────────────────────────

export interface CloudEndpoint {
  /** Intent namespace prefix (e.g. 'cloud.gemini') */
  namespace: string;

  /** Base URL for the endpoint */
  baseUrl: string;

  /** Optional API key header */
  apiKeyHeader?: string;
  apiKey?: string;

  /** HTTP method override (default: POST) */
  method?: 'GET' | 'POST' | 'PUT';

  /** Timeout in ms (default: 30000) */
  timeoutMs?: number;

  /** Human-readable description */
  description: string;
}

// ─── Cloud Connector ────────────────────────────────────────

export class CloudConnector implements RealmConnector {
  readonly realmName = 'cloud';

  private connected = false;
  private connectedAt = 0;
  private messageCountIn = 0;
  private messageCountOut = 0;
  private errorCount = 0;
  private lastHeartbeat = 0;
  private messageHandler: ((msg: RealmMessage) => void) | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  private endpoints: Map<string, CloudEndpoint> = new Map();

  constructor(endpoints?: CloudEndpoint[]) {
    // Register default endpoints (stubs if no keys provided)
    const defaults: CloudEndpoint[] = endpoints ?? [
      {
        namespace: 'cloud.gemini',
        baseUrl: process.env.GEMINI_API_URL ?? 'https://generativelanguage.googleapis.com/v1beta',
        apiKeyHeader: 'x-goog-api-key',
        apiKey: process.env.GEMINI_API_KEY,
        description: 'Google Gemini generative AI',
      },
      {
        namespace: 'cloud.worker',
        baseUrl: process.env.CF_WORKER_URL ?? 'https://primordia.workers.dev',
        apiKeyHeader: 'Authorization',
        apiKey: process.env.CF_API_TOKEN ? `Bearer ${process.env.CF_API_TOKEN}` : undefined,
        description: 'Cloudflare Workers',
      },
      {
        namespace: 'cloud.ai',
        baseUrl: process.env.CF_AI_GATEWAY_URL ?? 'https://gateway.ai.cloudflare.com',
        description: 'Cloudflare AI Gateway',
      },
    ];

    for (const ep of defaults) {
      this.endpoints.set(ep.namespace, ep);
    }
  }

  // ── Connect ─────────────────────────────────────────────

  async connect(): Promise<void> {
    this.connected = true;
    this.connectedAt = Date.now();
    this.lastHeartbeat = Date.now();

    // Start heartbeat
    this.heartbeatTimer = setInterval(() => {
      this.lastHeartbeat = Date.now();
      if (this.messageHandler) {
        this.messageHandler(createHeartbeat(this.realmName));
      }
    }, 10_000);

    console.log('[CLOUD CONNECTOR] Online', {
      endpoints: Array.from(this.endpoints.keys()),
    });
  }

  // ── Disconnect ──────────────────────────────────────────

  async disconnect(): Promise<void> {
    this.connected = false;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    console.log('[CLOUD CONNECTOR] Disconnected');
  }

  // ── Send (handle incoming command from bus) ─────────────

  async send(message: RealmMessage): Promise<void> {
    this.messageCountIn++;

    if (message.type !== 'command') return;

    try {
      // Find matching endpoint by intent prefix
      const endpoint = this.resolveEndpoint(message.intent);

      if (!endpoint) {
        // Stub: return mock response for unregistered endpoints
        if (this.messageHandler) {
          const response = createResponse(
            message,
            this.realmName,
            {
              mock: true,
              message: `Cloud endpoint for intent "${message.intent}" not configured. This is a stub response.`,
              intent: message.intent,
              payload: message.payload,
              availableEndpoints: Array.from(this.endpoints.keys()),
            },
            'OK'
          );
          this.messageCountOut++;
          this.messageHandler(response);
        }
        return;
      }

      // Execute HTTP request to cloud endpoint
      const result = await this.executeCloudRequest(endpoint, message);

      if (this.messageHandler) {
        const response = createResponse(
          message,
          this.realmName,
          {
            data: result,
            endpoint: endpoint.namespace,
            executedBy: 'CloudConnector',
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
            error: err instanceof Error ? err.message : 'Cloud request failed',
            executedBy: 'CloudConnector',
          },
          'ERROR'
        );
        this.messageCountOut++;
        this.messageHandler(errorResponse);
      }
    }
  }

  // ── Resolve Endpoint ────────────────────────────────────

  private resolveEndpoint(intent: string): CloudEndpoint | null {
    // Exact match
    if (this.endpoints.has(intent)) {
      return this.endpoints.get(intent)!;
    }

    // Prefix match: 'cloud.gemini.generate' → 'cloud.gemini'
    for (const [namespace, endpoint] of this.endpoints) {
      if (intent.startsWith(namespace + '.')) {
        return endpoint;
      }
    }

    return null;
  }

  // ── Execute Cloud HTTP Request ──────────────────────────

  private async executeCloudRequest(
    endpoint: CloudEndpoint,
    message: RealmMessage
  ): Promise<unknown> {
    const method = endpoint.method ?? 'POST';
    const timeoutMs = endpoint.timeoutMs ?? 30_000;

    // Derive URL path from intent suffix
    const suffix = message.intent.replace(endpoint.namespace + '.', '').replace(/\./g, '/');
    const url = `${endpoint.baseUrl}/${suffix}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (endpoint.apiKeyHeader && endpoint.apiKey) {
      headers[endpoint.apiKeyHeader] = endpoint.apiKey;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method !== 'GET' ? JSON.stringify(message.payload) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Cloud HTTP ${response.status}: ${errorText}`);
      }

      return await response.json().catch(() => ({ text: await response.text() }));
    } catch (err) {
      clearTimeout(timeout);
      throw err;
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
      latencyMs: 0,
      lastHeartbeat: this.lastHeartbeat,
      uptimeMs: this.connected ? Date.now() - this.connectedAt : 0,
      messageCountIn: this.messageCountIn,
      messageCountOut: this.messageCountOut,
      errorCount: this.errorCount,
      state: this.connected ? 'online' : 'offline',
      supportedIntents: Array.from(this.endpoints.keys()).map((ns) => `${ns}.*`),
    };
  }

  isConnected(): boolean {
    return this.connected;
  }

  // ── Registration Payload ────────────────────────────────

  getRegistration(): RealmRegistration {
    return {
      realmName: this.realmName,
      capabilities: Array.from(this.endpoints.values()).map((ep) => ({
        namespace: ep.namespace,
        description: ep.description,
        supportsResponse: true,
      })),
      supportedIntents: Array.from(this.endpoints.keys()).map((ns) => `${ns}.*`),
      protocolVersion: PROTOCOL_VERSION,
    };
  }

  // ── Dynamic Endpoint Registration ───────────────────────

  addEndpoint(endpoint: CloudEndpoint): void {
    this.endpoints.set(endpoint.namespace, endpoint);
  }

  removeEndpoint(namespace: string): void {
    this.endpoints.delete(namespace);
  }
}
