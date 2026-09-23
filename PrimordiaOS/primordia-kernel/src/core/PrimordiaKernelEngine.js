/**
 * PrimordiaOS Sovereign Kernel Subsystem
 * PrimordiaKernelEngine.ts - Masterplane Runtime Orchestrator
 */
import * as http from 'node:http';
import { KernelLogger } from '../logging/KernelLogger.js';
import { KernelSafetyLayer } from '../safety/KernelSafetyLayer.js';
import { KernelMemoryEngine } from '../memory/KernelMemoryEngine.js';
import { RealmRegistry } from '../registry/RealmRegistry.js';
import { EventBus } from '../eventbus/EventBus.js';
import { IPCRouter } from '../ipc/IPCRouter.js';
import { KernelTaskScheduler } from '../scheduler/KernelTaskScheduler.js';
import { KernelHeartbeat } from './KernelHeartbeat.js';
import { KernelCommandInterface } from '../commands/KernelCommandInterface.js';
import { KernelBoot } from './KernelBoot.js';
import { KernelShutdown } from './KernelShutdown.js';
export class PrimordiaKernelEngine {
    logger;
    safety;
    memory;
    registry;
    eventBus;
    ipc;
    scheduler;
    heartbeat;
    commands;
    bootOrchestrator;
    shutdownOrchestrator;
    state = 'OFFLINE';
    httpServer;
    options;
    constructor(options = {}) {
        this.options = {
            port: options.port ?? (process.env.PORT ? parseInt(process.env.PORT, 10) : 8080),
            autoBoot: options.autoBoot ?? false,
            enableHttpServer: options.enableHttpServer ?? true,
            configPath: options.configPath || process.env.KERNEL_CONFIG_PATH || '',
            manifestPath: options.manifestPath || process.env.REALM_REGISTRY_PATH || '',
        };
        // 1. Initialize core foundation
        this.logger = new KernelLogger({ subsystem: 'kernel' });
        this.safety = new KernelSafetyLayer(this.logger);
        this.memory = new KernelMemoryEngine(this.logger, { configPath: this.options.configPath });
        this.registry = new RealmRegistry(this.logger, this.options.manifestPath);
        this.eventBus = new EventBus(this.logger, this.safety);
        this.ipc = new IPCRouter(this.logger, this.safety, this.registry);
        this.scheduler = new KernelTaskScheduler(this.logger, this.safety);
        this.heartbeat = new KernelHeartbeat(this.logger, this.registry, this.eventBus, this.memory);
        this.commands = new KernelCommandInterface(this.logger, this.registry, this.eventBus, this.scheduler, this.memory, this.safety, this.heartbeat);
        this.bootOrchestrator = new KernelBoot(this.logger);
        this.shutdownOrchestrator = new KernelShutdown(this.logger);
        if (this.options.autoBoot) {
            this.boot().catch(err => {
                this.logger.fatal('Auto-boot failure', err);
            });
        }
    }
    getState() {
        return this.state;
    }
    /**
     * Orchestrates the complete boot sequence and launches HTTP masterplane listeners
     */
    async boot() {
        if (this.state === 'RUNNING' || this.state === 'BOOTING') {
            this.logger.warn(`Kernel boot called while state is ${this.state}`);
            return [];
        }
        this.state = 'BOOTING';
        const bootContext = {
            logger: this.logger,
            safety: this.safety,
            memory: this.memory,
            registry: this.registry,
            eventBus: this.eventBus,
            ipc: this.ipc,
            scheduler: this.scheduler,
            heartbeat: this.heartbeat,
        };
        try {
            const reports = await this.bootOrchestrator.executeBootSequence(bootContext);
            this.state = 'RUNNING';
            if (this.options.enableHttpServer) {
                await this.startHttpServer();
            }
            this.registerSignalHandlers();
            return reports;
        }
        catch (err) {
            this.state = 'DEGRADED';
            throw err;
        }
    }
    /**
     * Graceful termination
     */
    async shutdown() {
        if (this.state === 'TERMINATING' || this.state === 'HALTED') {
            return { success: true, durationMs: 0, stepsCompleted: [] };
        }
        this.state = 'TERMINATING';
        if (this.httpServer) {
            await new Promise(resolve => {
                this.httpServer?.close(() => resolve());
            });
            this.logger.info('HTTP server closed.');
        }
        const bootContext = {
            logger: this.logger,
            safety: this.safety,
            memory: this.memory,
            registry: this.registry,
            eventBus: this.eventBus,
            ipc: this.ipc,
            scheduler: this.scheduler,
            heartbeat: this.heartbeat,
        };
        const report = await this.shutdownOrchestrator.executeShutdownSequence(bootContext);
        this.state = 'HALTED';
        return report;
    }
    /**
     * Dispatches a command from Cockpit or CLI
     */
    async executeCommand(command) {
        return await this.commands.execute(command);
    }
    /**
     * Launches HTTP server for Cloud Run liveness/readiness probes and Cockpit API
     */
    startHttpServer() {
        return new Promise(resolve => {
            this.httpServer = http.createServer(async (req, res) => {
                const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
                const method = req.method?.toUpperCase();
                // CORS headers for Sovereign Cockpit UI
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                if (method === 'OPTIONS') {
                    res.writeHead(204);
                    res.end();
                    return;
                }
                // Liveness & Readiness Probes
                if (url.pathname === '/healthz' || url.pathname === '/livez') {
                    const healthy = this.state === 'RUNNING' || this.state === 'INITIALIZED';
                    res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        status: healthy ? 'HEALTHY' : 'UNHEALTHY',
                        state: this.state,
                        uptime: process.uptime(),
                        timestamp: new Date().toISOString(),
                    }));
                    return;
                }
                // Status Endpoint
                if (url.pathname === '/api/status' && method === 'GET') {
                    const vitality = this.heartbeat.getLatestMetrics();
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        kernel: 'PrimordiaOS Sovereign Kernel',
                        version: '1.0.0',
                        state: this.state,
                        vitality,
                        tasks: this.scheduler.getStats(),
                        realms: this.registry.listRealms(),
                    }));
                    return;
                }
                // Realms Endpoint
                if (url.pathname === '/api/realms' && method === 'GET') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(this.registry.listRealms()));
                    return;
                }
                // Cockpit Command Execution Endpoint
                if (url.pathname === '/api/command' && method === 'POST') {
                    let body = '';
                    req.on('data', chunk => {
                        body += chunk;
                    });
                    req.on('end', async () => {
                        try {
                            const parsed = JSON.parse(body || '{}');
                            const cmd = parsed.command;
                            if (!cmd) {
                                res.writeHead(400, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'Missing "command" field' }));
                                return;
                            }
                            const response = await this.commands.execute({
                                command: cmd,
                                args: parsed.args,
                                params: parsed.params,
                                caller: parsed.caller || 'cockpit-http',
                            });
                            res.writeHead(response.success ? 200 : 400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(response));
                        }
                        catch (err) {
                            const msg = err instanceof Error ? err.message : String(err);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: msg }));
                        }
                    });
                    return;
                }
                // Root Landing Page
                if (url.pathname === '/' && method === 'GET') {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>PrimordiaOS Sovereign Kernel</title>
                <style>
                  body { background: #0a0b10; color: #00f0ff; font-family: monospace; padding: 2rem; }
                  h1 { color: #00ff88; text-shadow: 0 0 10px rgba(0,255,136,0.3); }
                  .badge { display: inline-block; padding: 4px 8px; background: #161a24; border: 1px solid #00f0ff; border-radius: 4px; }
                </style>
              </head>
              <body>
                <h1>PRIMORDIA-OS MASTERPLANE KERNEL</h1>
                <p>Status: <span class="badge">${this.state}</span></p>
                <p>Uptime: ${Math.floor(process.uptime())} seconds</p>
                <p>Health Probes: <a href="/healthz" style="color: #00ff88">/healthz</a> | Status API: <a href="/api/status" style="color: #00ff88">/api/status</a></p>
              </body>
            </html>
          `);
                    return;
                }
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Endpoint not found' }));
            });
            this.httpServer.listen(this.options.port, () => {
                this.logger.info(`PrimordiaOS Masterplane HTTP server online on port ${this.options.port}`);
                resolve();
            });
        });
    }
    registerSignalHandlers() {
        const handleExit = async (signal) => {
            this.logger.info(`Received ${signal}. Triggering graceful kernel shutdown...`);
            await this.shutdown();
            process.exit(0);
        };
        process.once('SIGINT', () => handleExit('SIGINT'));
        process.once('SIGTERM', () => handleExit('SIGTERM'));
    }
}
