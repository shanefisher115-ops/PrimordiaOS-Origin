/**
 * PrimordiaOS Sovereign Cockpit — Sovereign Cockpit Engine
 * Central orchestrator binding the State Machine, Command Bus, Telemetry Router,
 * CRT Renderer, Holographic Compositor, Unreal Viewport, VisionCore Engine,
 * and Kernel Interface into a unified Cloud Run service.
 */
import http from 'node:http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../logging/CockpitLogger.js';
import { safetyGuards } from '../safety/CockpitSafetyGuards.js';
import { CockpitStateMachine } from './CockpitStateMachine.js';
import { CockpitCommandBus } from './CockpitCommandBus.js';
import { TelemetryRouter } from '../telemetry/TelemetryRouter.js';
import { CRTRenderer } from '../crt/CRTRenderer.js';
import { HolographicPanelSystem } from '../holo/HolographicPanelSystem.js';
import { UnrealViewport } from '../unreal/UnrealViewport.js';
import { VisionCoreOverlayEngine } from '../visioncore/VisionCoreOverlayEngine.js';
import { KernelInterface } from '../kernel/KernelInterface.js';
export class SovereignCockpitEngine {
    config;
    stateMachine;
    commandBus;
    telemetryRouter;
    crtRenderer;
    holoPanels;
    unrealViewport;
    visionCore;
    kernel;
    app = null;
    server = null;
    wss = null;
    isRunning = false;
    tickInterval = null;
    lastTickTimestamp = Date.now();
    constructor(config = {}) {
        this.config = {
            port: Number(process.env.PORT) || 8080,
            unrealBridgeUrl: process.env.UNREAL_BRIDGE_URL,
            visionCoreUrl: process.env.VISIONCORE_URL,
            moneyPlugHubUrl: process.env.MONEYPLUGHUB_URL,
            kernelMasterplaneUrl: process.env.KERNEL_URL,
            enableHttpServer: true,
            ...config
        };
        logger.info('SovereignCockpitEngine', 'Initializing Sovereign Cockpit Subsystems...');
        // 1. Core State & Bus
        this.stateMachine = new CockpitStateMachine();
        this.commandBus = new CockpitCommandBus();
        // 2. Telemetry & Hardware Viewports
        this.telemetryRouter = new TelemetryRouter();
        this.crtRenderer = new CRTRenderer(100, 32);
        this.holoPanels = new HolographicPanelSystem();
        this.unrealViewport = new UnrealViewport(this.config.unrealBridgeUrl);
        this.visionCore = new VisionCoreOverlayEngine(this.config.visionCoreUrl);
        this.kernel = new KernelInterface(this.config.kernelMasterplaneUrl);
        this.wireSubsystems();
    }
    /**
     * Connects events, command handlers, and telemetry routes across subsystems.
     */
    wireSubsystems() {
        // A. Wire Command Bus Handlers
        this.commandBus.registerHandler('EXEC_TERMINAL', async (cmd) => {
            const raw = typeof cmd.payload === 'string' ? cmd.payload : cmd.payload?.command;
            return await this.kernel.dispatchCommand(raw);
        });
        this.commandBus.registerHandler('SWITCH_STATE', (cmd) => {
            const targetState = cmd.payload?.state;
            return this.stateMachine.transition(targetState, `Command from ${cmd.sourceRealm}`);
        });
        this.commandBus.registerHandler('TRIGGER_NIAGARA', (cmd) => {
            return this.unrealViewport.emitSignal({
                packetType: 'niagara_pulse',
                coordinates: cmd.payload?.coordinates || { x: 0, y: 0, z: 100 },
                colorHex: cmd.payload?.colorHex || '#F5B700'
            });
        });
        this.commandBus.registerHandler('SET_LUT', (cmd) => {
            const lut = cmd.payload?.lut;
            this.crtRenderer.setLUT(lut);
            return { lut };
        });
        // B. Wire Telemetry to Panels and CRT
        this.telemetryRouter.subscribe('MoneyPlugHub', (envelope) => {
            this.holoPanels.routeDataToPanels('TELEMETRY', envelope.payload);
            this.crtRenderer.drawText(2, 2, `[MPH] YIELD: ${envelope.payload.loopYieldPercentage || 0}%`, 0, 255, 100);
        });
        this.telemetryRouter.subscribe('PrimordiaOSKernel', (envelope) => {
            this.holoPanels.routeDataToPanels('SYSTEM', envelope.payload);
            const state = envelope.payload.worldState;
            if (state === 'CHARGED') {
                this.stateMachine.transition('CHARGED', 'Kernel telemetry charged pulse');
            }
            else if (state === 'FLUX') {
                this.stateMachine.transition('FLUX', 'Kernel mutations active');
            }
        });
        this.telemetryRouter.subscribe('VisionCore', (envelope) => {
            this.holoPanels.routeDataToPanels('VISION', envelope.payload);
            this.visionCore.ingestVisionTelemetry(envelope.payload);
        });
        this.telemetryRouter.subscribe('UnrealBridge', (envelope) => {
            this.holoPanels.routeDataToPanels('SIMULATION', envelope.payload);
        });
        // C. Forward Unreal Viewport signals to Telemetry Router
        this.unrealViewport.onSignal((payload) => {
            this.telemetryRouter.ingestUnrealBridge(payload);
        });
        // D. State Machine transitions hook CRT text
        this.stateMachine.subscribe((transition) => {
            this.crtRenderer.drawText(2, 28, `STATE: ${transition.to} (${transition.reason})`, 255, 200, 50);
            this.broadcastWebSocket({
                type: 'state_transition',
                transition
            });
        });
    }
    /**
     * Starts the cockpit engine, connects viewports, starts HTTP/WS server, and frame loop.
     */
    async bootstrap() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        logger.info('SovereignCockpitEngine', 'Bootstrapping Sovereign Cockpit Engine...');
        this.stateMachine.transition('IDLE', 'Bootstrap sequence complete');
        // Connect Unreal Viewport WebSocket Client
        this.unrealViewport.connect();
        // Setup HTTP and WebSocket Servers for Cloud Run
        if (this.config.enableHttpServer) {
            this.setupHttpServer();
        }
        // Start Simulation Frame Loop (30 FPS default for server backend)
        this.lastTickTimestamp = Date.now();
        this.tickInterval = setInterval(() => this.tick(), 1000 / 30);
        logger.info('SovereignCockpitEngine', `Sovereign Cockpit is LIVE and operational on port ${this.config.port}`);
    }
    /**
     * Main simulation frame tick.
     */
    tick() {
        const now = Date.now();
        const deltaSeconds = Math.max(0.001, (now - this.lastTickTimestamp) / 1000);
        this.lastTickTimestamp = now;
        // 1. Advance Holographic Panel Transitions (Lerp physics)
        this.holoPanels.updateTransitions(deltaSeconds);
        // 2. Advance VisionCore Overlays & Cosmic Particles
        const activePanelPositions = this.holoPanels.getPanels().map(p => p.position);
        this.visionCore.setPanelAttractors(activePanelPositions);
        const overlayFrame = this.visionCore.tick(deltaSeconds);
        // 3. Tick CRT Renderer frame
        const crtFrame = this.crtRenderer.renderFrame();
        // 4. Ingest automatic internal heartbeat telemetry
        if (Math.random() < 0.05) {
            this.telemetryRouter.ingestKernel(this.kernel.getTelemetryPayload());
        }
        // 5. Broadcast frame snapshot to WebSocket subscribers
        if (this.wss && this.wss.clients.size > 0 && Math.random() < 0.3) {
            this.broadcastWebSocket({
                type: 'frame_tick',
                crtStats: crtFrame.stats,
                overlay: {
                    particleCount: overlayFrame.particles.length,
                    constellationsCount: overlayFrame.constellations.length,
                    audio: overlayFrame.audioPulse
                },
                state: this.stateMachine.getState()
            });
        }
    }
    /**
     * Configures Express REST API and WebSocket streaming for Cloud Run.
     */
    setupHttpServer() {
        this.app = express();
        this.app.use(express.json());
        // Cloud Run Health Probes
        this.app.get('/healthz', (_req, res) => {
            res.status(200).json({ status: 'ok', state: this.stateMachine.getState(), uptime: process.uptime() });
        });
        this.app.get('/livez', (_req, res) => {
            res.status(200).send('ALIVE');
        });
        // Cockpit Metrics Endpoint
        this.app.get('/metrics', (_req, res) => {
            res.json({
                state: this.stateMachine.getState(),
                telemetry: this.telemetryRouter.getStats(),
                commandBus: this.commandBus.getStats(),
                crt: this.crtRenderer.getStats(),
                unreal: this.unrealViewport.getState(),
                memory: process.memoryUsage()
            });
        });
        // Status and License
        this.app.get('/api/status', (_req, res) => {
            res.json({
                state: this.stateMachine.getState(),
                license: safetyGuards.getLicenseStatus(),
                panels: this.holoPanels.getPanels(),
                layout: this.holoPanels.getLayout()
            });
        });
        // Plain English to Disk Terminal Execution
        this.app.post('/api/terminal/exec', async (req, res) => {
            const command = req.body?.command;
            if (!command) {
                res.status(400).json({ error: 'Missing command string' });
                return;
            }
            const result = await this.commandBus.dispatch({
                id: 'req-' + Math.random().toString(36).substring(2, 9),
                type: 'EXEC_TERMINAL',
                payload: { command },
                sourceRealm: 'WebCockpit',
                timestamp: Date.now()
            });
            res.json(result);
        });
        // Emit Unreal Signal
        this.app.post('/api/unreal/signal', (req, res) => {
            const coordinates = req.body?.coordinates || { x: 0, y: 0, z: 0 };
            const success = this.unrealViewport.emitSignal({
                packetType: 'niagara_pulse',
                coordinates,
                colorHex: req.body?.colorHex
            });
            res.json({ success });
        });
        // In-memory Logs
        this.app.get('/api/logs', (_req, res) => {
            res.json(logger.getRecentLogs(100));
        });
        // CRT text frame snapshot
        this.app.get('/api/crt/frame', (_req, res) => {
            const frame = this.crtRenderer.renderFrame();
            res.type('text/plain').send(frame.textSnapshot);
        });
        // Create HTTP & WebSocket Server
        this.server = http.createServer(this.app);
        this.wss = new WebSocketServer({ server: this.server, path: '/ws/cockpit' });
        this.wss.on('connection', (ws) => {
            logger.info('SovereignCockpitEngine', 'WebSocket client connected to /ws/cockpit');
            ws.send(JSON.stringify({
                type: 'initial_state',
                state: this.stateMachine.getState(),
                license: safetyGuards.getLicenseStatus(),
                panels: this.holoPanels.getPanels(),
                timestamp: Date.now()
            }));
            ws.on('message', async (message) => {
                try {
                    const parsed = JSON.parse(message.toString());
                    if (parsed.type === 'command') {
                        const res = await this.commandBus.dispatch({
                            id: 'ws-' + Math.random().toString(36).substring(2, 7),
                            type: parsed.commandType,
                            payload: parsed.payload,
                            sourceRealm: 'WebSocketClient',
                            timestamp: Date.now()
                        });
                        ws.send(JSON.stringify({ type: 'command_result', result: res }));
                    }
                }
                catch (wsErr) {
                    logger.warn('SovereignCockpitEngine', `Error parsing client WS message: ${wsErr}`);
                }
            });
        });
        this.server.listen(this.config.port, () => {
            logger.info('SovereignCockpitEngine', `Express & WebSocket server listening on port ${this.config.port}`);
        });
    }
    broadcastWebSocket(data) {
        if (!this.wss)
            return;
        const msg = JSON.stringify(data);
        for (const client of this.wss.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(msg);
            }
        }
    }
    /**
     * Graceful shutdown of all subsystems, timers, and listeners.
     */
    async shutdown() {
        if (!this.isRunning)
            return;
        logger.info('SovereignCockpitEngine', 'Initiating graceful Sovereign Cockpit shutdown...');
        this.stateMachine.transition('SHUTDOWN', 'Subsystem shutdown directive');
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
        this.unrealViewport.disconnect();
        if (this.wss) {
            this.wss.close();
            this.wss = null;
        }
        if (this.server) {
            await new Promise((resolve) => this.server?.close(() => resolve()));
            this.server = null;
        }
        this.isRunning = false;
        logger.info('SovereignCockpitEngine', 'Sovereign Cockpit successfully shut down.');
    }
}
