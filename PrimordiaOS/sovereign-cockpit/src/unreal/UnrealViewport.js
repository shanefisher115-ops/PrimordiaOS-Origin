/**
 * PrimordiaOS Sovereign Cockpit — Unreal Engine 5.4 Viewport Subsystem
 * Manages bidirectional WebSocket telemetry, Niagara particle pulses,
 * procedural mesh stream synchronization, and HUD overlays.
 */
import WebSocket from 'ws';
import { logger } from '../logging/CockpitLogger.js';
export class UnrealViewport {
    wsUrl;
    ws = null;
    isIntentionalClose = false;
    reconnectTimeout = null;
    backoffDelayMs = 1000;
    maxBackoffDelayMs = 30000;
    signalHandlers = new Set();
    state = {
        connected: false,
        activeActors: new Map(),
        camera: {
            position: { x: 0, y: -500, z: 200 },
            rotation: { pitch: -15, yaw: 0, roll: 0 },
            scale: { x: 1, y: 1, z: 1 }
        },
        niagaraParticleCount: 0,
        physicsTickRate: 60,
        lastPingMs: 0,
        reconnectAttempts: 0
    };
    constructor(wsUrl) {
        this.wsUrl = wsUrl || process.env.UNREAL_BRIDGE_URL || 'ws://127.0.0.1:3000/ws/unreal';
        logger.info('UnrealViewport', `Initialized Unreal Viewport client pointing to: ${this.wsUrl}`);
    }
    /**
     * Connects to the Unreal Engine 5.4 WebSocket server.
     */
    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }
        this.isIntentionalClose = false;
        logger.info('UnrealViewport', `Connecting to Unreal Engine bridge at ${this.wsUrl}...`);
        try {
            this.ws = new WebSocket(this.wsUrl);
            this.ws.on('open', () => {
                this.state.connected = true;
                this.state.reconnectAttempts = 0;
                this.backoffDelayMs = 1000;
                logger.info('UnrealViewport', 'Established active link to Unreal Engine 5.4 bridge');
                // Handshake packet
                this.send({
                    type: 'handshake',
                    client: 'SovereignCockpit',
                    timestamp: Date.now()
                });
            });
            this.ws.on('message', (data) => {
                this.handleMessage(data.toString());
            });
            this.ws.on('error', (err) => {
                logger.warn('UnrealViewport', `Unreal bridge WebSocket error: ${err.message}`);
            });
            this.ws.on('close', () => {
                this.state.connected = false;
                logger.warn('UnrealViewport', 'Unreal bridge WebSocket connection closed');
                if (!this.isIntentionalClose) {
                    this.scheduleReconnect();
                }
            });
        }
        catch (err) {
            logger.error('UnrealViewport', `Failed to construct WebSocket client: ${err}`);
            this.scheduleReconnect();
        }
    }
    disconnect() {
        this.isIntentionalClose = true;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.state.connected = false;
        logger.info('UnrealViewport', 'Disconnected Unreal bridge viewport');
    }
    onSignal(handler) {
        this.signalHandlers.add(handler);
        return () => this.signalHandlers.delete(handler);
    }
    /**
     * Emits a Niagara particle pulse or actor spawn directive to Unreal Engine 5.4.
     */
    emitSignal(packet) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            logger.debug('UnrealViewport', 'Cannot emit signal: Unreal bridge not currently connected');
            return false;
        }
        const payload = {
            ...packet,
            timestamp: Date.now(),
            client: 'SovereignCockpit'
        };
        return this.send(payload);
    }
    /**
     * Returns current viewport snapshot and HUD overlay telemetry.
     */
    getViewportTelemetry() {
        return {
            packetType: 'camera_sync',
            connectedClients: this.state.connected ? 1 : 0,
            physicsTickRate: this.state.physicsTickRate,
            activeActorsCount: this.state.activeActors.size,
            niagaraParticleCount: this.state.niagaraParticleCount,
            cameraTransform: { ...this.state.camera }
        };
    }
    getState() {
        return {
            ...this.state,
            activeActors: new Map(this.state.activeActors)
        };
    }
    send(data) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN)
            return false;
        try {
            this.ws.send(JSON.stringify(data));
            return true;
        }
        catch (err) {
            logger.error('UnrealViewport', `Failed to send WebSocket frame: ${err}`);
            return false;
        }
    }
    handleMessage(raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed.packetType || parsed.type === 'unreal_telemetry') {
                const payload = {
                    packetType: parsed.packetType || 'camera_sync',
                    connectedClients: parsed.connectedClients || 1,
                    physicsTickRate: parsed.physicsTickRate || 60,
                    activeActorsCount: parsed.activeActorsCount || 0,
                    niagaraParticleCount: parsed.niagaraParticleCount || 0,
                    cameraTransform: parsed.cameraTransform || this.state.camera,
                    lastActorPulse: parsed.lastActorPulse
                };
                this.state.physicsTickRate = payload.physicsTickRate;
                this.state.niagaraParticleCount = payload.niagaraParticleCount;
                if (payload.cameraTransform) {
                    this.state.camera = payload.cameraTransform;
                }
                if (payload.lastActorPulse) {
                    this.state.activeActors.set(payload.lastActorPulse.actorId, {
                        position: payload.lastActorPulse.coordinates,
                        velocity: payload.lastActorPulse.velocity,
                        colorHex: payload.lastActorPulse.colorHex,
                        lastSeen: Date.now()
                    });
                }
                for (const handler of this.signalHandlers) {
                    try {
                        handler(payload);
                    }
                    catch (handlerErr) {
                        logger.error('UnrealViewport', `Error in signal handler: ${handlerErr}`);
                    }
                }
            }
        }
        catch (err) {
            logger.debug('UnrealViewport', `Ignored non-JSON frame from Unreal bridge: ${raw.substring(0, 50)}`);
        }
    }
    scheduleReconnect() {
        if (this.reconnectTimeout)
            return;
        this.state.reconnectAttempts++;
        logger.info('UnrealViewport', `Scheduling reconnect attempt #${this.state.reconnectAttempts} in ${this.backoffDelayMs}ms...`);
        this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.backoffDelayMs = Math.min(this.backoffDelayMs * 1.5, this.maxBackoffDelayMs);
            this.connect();
        }, this.backoffDelayMs);
    }
}
