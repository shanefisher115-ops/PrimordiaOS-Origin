/**
 * @file UnrealRealmAdapter.ts
 * @description PrimordiaOS Sovereign Realm Unifier - Unreal Engine 5.4 Simulation Realm Adapter.
 * Provides high-speed bidirectional telemetry, Niagara particle burst emission, Pawn state
 * tracking, spatial event ingestion, and simulation health diagnostics.
 */
import { EventEmitter } from 'node:events';
import http from 'node:http';
export class UnrealRealmAdapter extends EventEmitter {
    config;
    isConnected = false;
    wsClient = null;
    reconnectTimeout = null;
    currentBackoffMs;
    consecutiveErrors = 0;
    isCircuitOpen = false;
    pawns = new Map();
    lastMetrics = null;
    constructor(config = {}) {
        super();
        this.config = {
            wsUrl: config.wsUrl || process.env.UNREAL_WS_URL || 'ws://localhost:17800',
            httpHost: config.httpHost || 'localhost',
            httpPort: config.httpPort || 3000,
            sovereignToken: config.sovereignToken || process.env.PRIMORDIA_SOVEREIGN_TOKEN || 'PRIMORDIA_SOVEREIGN_TOKEN',
            autoReconnect: config.autoReconnect ?? true,
            reconnectIntervalMs: config.reconnectIntervalMs ?? 1000,
            maxReconnectIntervalMs: config.maxReconnectIntervalMs ?? 15000,
            pingIntervalMs: config.pingIntervalMs ?? 5000,
            circuitBreakerThreshold: config.circuitBreakerThreshold ?? 5,
        };
        this.currentBackoffMs = this.config.reconnectIntervalMs;
    }
    /**
     * Initializes connectivity to the Unreal Engine Sovereign Simulation Realm.
     */
    /**
     * Initializes connectivity to the Unreal Engine Sovereign Simulation Realm.
     */
    async connect() {
        if (this.isConnected)
            return true;
        return new Promise(async (resolve) => {
            let hasResolved = false;
            const finish = (result) => {
                if (!hasResolved) {
                    hasResolved = true;
                    resolve(result);
                }
            };
            // Set connection timeout
            const connTimeout = setTimeout(() => {
                finish(false);
            }, 1500);
            connTimeout.unref();
            try {
                const wsModule = await import('ws').catch(() => null);
                if (!wsModule) {
                    this.emit('warn', 'ws module not found, operating in HTTP REST fallback mode');
                    finish(false);
                    return;
                }
                const WebSocket = wsModule.default || wsModule.WebSocket;
                const urlWithToken = `${this.config.wsUrl}?token=${encodeURIComponent(this.config.sovereignToken)}`;
                this.wsClient = new WebSocket(urlWithToken);
                this.wsClient.on('open', () => {
                    clearTimeout(connTimeout);
                    this.isConnected = true;
                    this.consecutiveErrors = 0;
                    this.isCircuitOpen = false;
                    this.currentBackoffMs = this.config.reconnectIntervalMs;
                    this.emit('connected', { url: this.config.wsUrl, timestamp: Date.now() });
                    // Authenticate & Register Realm Unifier handshake
                    this.sendRaw({
                        type: 'REALM_UNIFIER_HANDSHAKE',
                        token: this.config.sovereignToken,
                        realm: 'simulation',
                        timestamp: Date.now(),
                    });
                    finish(true);
                });
                this.wsClient.on('message', (raw) => {
                    try {
                        const packet = JSON.parse(raw.toString());
                        this.handleInboundPacket(packet);
                    }
                    catch (err) {
                        this.emit('warn', `Failed to parse incoming Unreal packet: ${err.message}`);
                    }
                });
                this.wsClient.on('error', (err) => {
                    clearTimeout(connTimeout);
                    this.consecutiveErrors++;
                    if (this.consecutiveErrors >= this.config.circuitBreakerThreshold) {
                        this.isCircuitOpen = true;
                        this.emit('circuit_breaker_opened', { consecutiveErrors: this.consecutiveErrors });
                    }
                    if (this.listenerCount('error') > 0) {
                        this.emit('error', err);
                    }
                    else {
                        this.emit('warn', `Unreal connection error: ${err.message}`);
                    }
                    finish(false);
                });
                this.wsClient.on('close', (code, reason) => {
                    clearTimeout(connTimeout);
                    this.isConnected = false;
                    this.emit('disconnected', { code, reason: reason?.toString(), timestamp: Date.now() });
                    finish(false);
                    if (this.config.autoReconnect && !hasResolved) {
                        this.scheduleReconnect();
                    }
                });
            }
            catch (err) {
                clearTimeout(connTimeout);
                if (this.listenerCount('error') > 0) {
                    this.emit('error', err);
                }
                else {
                    this.emit('warn', `Unreal connection exception: ${err.message}`);
                }
                finish(false);
            }
        });
    }
    /**
     * Schedule exponential backoff reconnect attempt.
     */
    scheduleReconnect() {
        if (this.reconnectTimeout)
            return;
        this.reconnectTimeout = setTimeout(async () => {
            this.reconnectTimeout = null;
            this.currentBackoffMs = Math.min(this.currentBackoffMs * 1.5, this.config.maxReconnectIntervalMs);
            await this.connect();
        }, this.currentBackoffMs);
    }
    /**
     * Dispatches a Niagara particle pulse wave into Unreal Engine 5.4.
     */
    async triggerNiagara(options) {
        const colorRGBA = this.normalizeColor(options.color);
        const payload = {
            type: 'niagara_pulse',
            event_type: 'pulse_update',
            niagara_system: options.systemName,
            coordinates: options.coordinates,
            velocity: options.velocity || { x: 0, y: 0, z: 0 },
            color: colorRGBA,
            intensity: options.intensity ?? 1.0,
            scale: options.scale ?? 1.0,
            parameters: options.parameters || {},
            targetActorId: options.targetActorId,
            timestamp: Date.now(),
            sovereign_token: this.config.sovereignToken,
        };
        // Primary: Send over WebSocket if connected
        if (this.isConnected && this.wsClient?.readyState === 1) {
            return this.sendRaw(payload);
        }
        // Secondary: Fallback to HTTP Masterplane bridge
        return this.postHttpSignal(payload);
    }
    /**
     * Synchronizes Pawn state updates into the local registry.
     */
    updatePawnState(pawn) {
        pawn.timestamp = Date.now();
        this.pawns.set(pawn.pawnId, pawn);
        this.emit('pawn_updated', pawn);
        // Forward to Unreal Engine simulation if requested
        this.sendRaw({
            type: 'PAWN_STATE_SYNC',
            pawn,
            timestamp: Date.now(),
        });
    }
    /**
     * Retrieve all cached active Pawn actors.
     */
    getPawns() {
        return Array.from(this.pawns.values());
    }
    /**
     * Ingest and broadcast an internal or external spatial event.
     */
    ingestSpatialEvent(event) {
        this.emit('spatial_event', event);
        // If spatial event is significant, trigger Niagara visual manifestation
        if (event.type === 'SPATIAL_ANOMALY') {
            this.triggerNiagara({
                systemName: 'NS_EvolutionFractalBurst',
                coordinates: event.coordinates,
                color: 'Imperial Gold',
                intensity: 2.0,
                parameters: { anomalyId: event.eventId },
            });
        }
    }
    /**
     * Return latest known simulation metrics.
     */
    getMetrics() {
        return (this.lastMetrics || {
            fps: 60,
            frametimeMs: 16.66,
            gpuRenderMs: 7.4,
            drawCalls: 180,
            activeParticles: 4200,
            activeActors: this.pawns.size,
            engineVersion: '5.4.4-Primordia',
            levelName: 'L_PrimordialOrigin',
            timestamp: Date.now(),
        });
    }
    /**
     * Disconnect adapter cleanly.
     */
    disconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.wsClient) {
            try {
                this.wsClient.close();
            }
            catch {
                // ignore
            }
            this.wsClient = null;
        }
        this.isConnected = false;
    }
    /**
     * Route incoming packets to corresponding event emitters.
     */
    handleInboundPacket(packet) {
        if (!packet || typeof packet !== 'object')
            return;
        switch (packet.type || packet.event) {
            case 'telemetry':
            case 'telemetry_update':
            case 'SIMULATION_TICK': {
                const data = packet.data || packet.payload || {};
                this.lastMetrics = {
                    fps: Number(data.fps || data.metrics?.fps || 60),
                    frametimeMs: Number(data.frametimeMs || 16.66),
                    gpuRenderMs: Number(data.gpuRenderMs || 7.4),
                    drawCalls: Number(data.drawCalls || 210),
                    activeParticles: Number(data.particle_rate || data.activeParticles || 5000),
                    activeActors: Number(data.actorsCount || this.pawns.size),
                    engineVersion: String(data.engineVersion || '5.4'),
                    levelName: String(data.levelName || 'L_PrimordialVoid'),
                    timestamp: Date.now(),
                };
                this.emit('telemetry_tick', this.lastMetrics);
                break;
            }
            case 'PAWN_TELEMETRY':
            case 'actor_telemetry': {
                if (packet.pawn || packet.actor) {
                    const rawPawn = packet.pawn || packet.actor;
                    const pawn = {
                        pawnId: rawPawn.pawnId || rawPawn.actorId || 'Pawn_Unknown',
                        pawnClass: rawPawn.pawnClass || rawPawn.actorClass || 'BP_SovereignPawn',
                        isSovereign: Boolean(rawPawn.isSovereign ?? true),
                        transform: rawPawn.transform || {
                            location: rawPawn.location || { x: 0, y: 0, z: 0 },
                            rotation: rawPawn.rotation || { pitch: 0, yaw: 0, roll: 0 },
                            scale: rawPawn.scale || { x: 1, y: 1, z: 1 },
                        },
                        velocity: rawPawn.velocity || { x: 0, y: 0, z: 0 },
                        health: Number(rawPawn.health ?? 100),
                        energy: Number(rawPawn.energy ?? 100),
                        activeStatus: rawPawn.activeStatus || 'IDLE',
                        metadata: rawPawn.metadata || {},
                        timestamp: Date.now(),
                    };
                    this.pawns.set(pawn.pawnId, pawn);
                    this.emit('pawn_updated', pawn);
                }
                break;
            }
            case 'SPATIAL_EVENT':
            case 'spatial_trigger': {
                const spatialEvent = {
                    eventId: packet.eventId || `evt_${Date.now()}`,
                    type: packet.subType || 'SPATIAL_ANOMALY',
                    coordinates: packet.coordinates || { x: 0, y: 0, z: 0 },
                    radius: packet.radius,
                    sourceActorId: packet.sourceActorId,
                    targetActorId: packet.targetActorId,
                    data: packet.data || {},
                    timestamp: Date.now(),
                };
                this.ingestSpatialEvent(spatialEvent);
                break;
            }
            case 'NIAGARA_EVENT_ACK':
            case 'ACTION_TRIGGERED': {
                this.emit('niagara_acknowledged', packet);
                break;
            }
            default:
                this.emit('raw_packet', packet);
        }
    }
    /**
     * Helper to send JSON packet over active WebSocket.
     */
    sendRaw(packet) {
        if (!this.isConnected || !this.wsClient || this.wsClient.readyState !== 1) {
            return false;
        }
        try {
            this.wsClient.send(JSON.stringify(packet));
            return true;
        }
        catch (err) {
            this.emit('error', new Error(`Failed to transmit packet over WebSocket: ${err.message}`));
            return false;
        }
    }
    /**
     * Helper to dispatch signal via HTTP REST endpoint `/api/unreal/signal`.
     */
    async postHttpSignal(payload) {
        return new Promise((resolve) => {
            const data = JSON.stringify(payload);
            const req = http.request({
                hostname: this.config.httpHost,
                port: this.config.httpPort,
                path: '/api/unreal/signal',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data),
                    'X-Primordia-Sovereign-Token': this.config.sovereignToken,
                },
                timeout: 2000,
            }, (res) => {
                resolve(res.statusCode === 200);
            });
            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
            req.write(data);
            req.end();
        });
    }
    /**
     * Translates preset Color LUT strings or array inputs into normalized RGBA.
     */
    normalizeColor(color) {
        if (!color)
            return { r: 1, g: 1, b: 1, a: 1 };
        if (color === 'Imperial Gold') {
            return { r: 0.95, g: 0.77, b: 0.19, a: 1.0 }; // Warm amber
        }
        if (color === 'Cyberpunk Emerald') {
            return { r: 0.05, g: 0.95, b: 0.65, a: 1.0 }; // Neon cyan-emerald
        }
        if (color === 'Neutral Raw') {
            return { r: 0.8, g: 0.8, b: 0.8, a: 1.0 }; // Linear neutral
        }
        if (Array.isArray(color)) {
            return {
                r: Number(color[0] ?? 1),
                g: Number(color[1] ?? 1),
                b: Number(color[2] ?? 1),
                a: Number(color[3] ?? 1),
            };
        }
        if (typeof color === 'object' && 'r' in color) {
            return color;
        }
        return { r: 1, g: 1, b: 1, a: 1 };
    }
}
export default UnrealRealmAdapter;
