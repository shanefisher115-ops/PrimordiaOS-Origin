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
import { createResponse, createHeartbeat, PROTOCOL_VERSION, } from '../protocol.js';
// ─── Cloud Connector ────────────────────────────────────────
export class CloudConnector {
    realmName = 'cloud';
    connected = false;
    connectedAt = 0;
    messageCountIn = 0;
    messageCountOut = 0;
    errorCount = 0;
    lastHeartbeat = 0;
    messageHandler = null;
    heartbeatTimer = null;
    endpoints = new Map();
    constructor(endpoints) {
        // Register default endpoints (stubs if no keys provided)
        const defaults = endpoints ?? [
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
    async connect() {
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
    async disconnect() {
        this.connected = false;
        if (this.heartbeatTimer)
            clearInterval(this.heartbeatTimer);
        console.log('[CLOUD CONNECTOR] Disconnected');
    }
    // ── Send (handle incoming command from bus) ─────────────
    async send(message) {
        this.messageCountIn++;
        if (message.type !== 'command')
            return;
        try {
            // Find matching endpoint by intent prefix
            const endpoint = this.resolveEndpoint(message.intent);
            if (!endpoint) {
                // Stub: return mock response for unregistered endpoints
                if (this.messageHandler) {
                    const response = createResponse(message, this.realmName, {
                        mock: true,
                        message: `Cloud endpoint for intent "${message.intent}" not configured. This is a stub response.`,
                        intent: message.intent,
                        payload: message.payload,
                        availableEndpoints: Array.from(this.endpoints.keys()),
                    }, 'OK');
                    this.messageCountOut++;
                    this.messageHandler(response);
                }
                return;
            }
            // Execute HTTP request to cloud endpoint
            const result = await this.executeCloudRequest(endpoint, message);
            if (this.messageHandler) {
                const response = createResponse(message, this.realmName, {
                    data: result,
                    endpoint: endpoint.namespace,
                    executedBy: 'CloudConnector',
                }, 'OK');
                this.messageCountOut++;
                this.messageHandler(response);
            }
        }
        catch (err) {
            this.errorCount++;
            if (this.messageHandler) {
                const errorResponse = createResponse(message, this.realmName, {
                    error: err instanceof Error ? err.message : 'Cloud request failed',
                    executedBy: 'CloudConnector',
                }, 'ERROR');
                this.messageCountOut++;
                this.messageHandler(errorResponse);
            }
        }
    }
    // ── Resolve Endpoint ────────────────────────────────────
    resolveEndpoint(intent) {
        // Exact match
        if (this.endpoints.has(intent)) {
            return this.endpoints.get(intent);
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
    async executeCloudRequest(endpoint, message) {
        const method = endpoint.method ?? 'POST';
        const timeoutMs = endpoint.timeoutMs ?? 30_000;
        // Derive URL path from intent suffix
        const suffix = message.intent.replace(endpoint.namespace + '.', '').replace(/\./g, '/');
        const url = `${endpoint.baseUrl}/${suffix}`;
        const headers = {
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
        }
        catch (err) {
            clearTimeout(timeout);
            throw err;
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
    isConnected() {
        return this.connected;
    }
    // ── Registration Payload ────────────────────────────────
    getRegistration() {
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
    addEndpoint(endpoint) {
        this.endpoints.set(endpoint.namespace, endpoint);
    }
    removeEndpoint(namespace) {
        this.endpoints.delete(namespace);
    }
}
