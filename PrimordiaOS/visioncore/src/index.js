/**
 * VisionCore - Director-Grade Creative Intelligence Subsystem
 * Entry point & Cloud Run Microservice Server
 */
import http from 'node:http';
import { VisionCoreEngine } from './core/VisionCoreEngine.js';
import { CreativeOrchestrator } from './core/CreativeOrchestrator.js';
import { StyleMemoryEngine } from './core/StyleMemoryEngine.js';
import { Generator } from './modules/Generator.js';
import { RenderLoop } from './modules/RenderLoop.js';
import { CoreForge } from './modules/CoreForge.js';
import { PulseEngine } from './modules/PulseEngine.js';
import { InnovationGenerator } from './modules/InnovationGenerator.js';
import { VisionCoreSafetyGuards } from './safety/VisionCoreSafetyGuards.js';
import { VisionCoreLogger } from './logging/VisionCoreLogger.js';
// Primary Export (Required by System Requirements)
export { VisionCoreEngine };
// Secondary Component & Module Exports
export { CreativeOrchestrator, StyleMemoryEngine, Generator, RenderLoop, CoreForge, PulseEngine, InnovationGenerator, VisionCoreSafetyGuards, VisionCoreLogger };
// Global Singleton Engine Instance
export const defaultEngine = new VisionCoreEngine();
/**
 * Creates and starts the HTTP Microservice server for Cloud Run / Docker environments.
 */
export function startVisionCoreServer(port = Number(process.env.PORT) || 8080) {
    const logger = new VisionCoreLogger('VisionCoreServer');
    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const pathname = url.pathname;
        const method = req.method?.toUpperCase();
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        if (method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        try {
            if (pathname === '/' && method === 'GET') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    service: 'PrimordiaOS VisionCore Subsystem',
                    identity: VisionCoreEngine.IDENTITY,
                    version: VisionCoreEngine.VERSION,
                    status: 'ONLINE',
                    endpoints: [
                        'GET /health',
                        'POST /api/visioncore/process',
                        'GET /api/visioncore/styles',
                        'GET /api/visioncore/logs'
                    ]
                }, null, 2));
                return;
            }
            if (pathname === '/health' && method === 'GET') {
                const health = defaultEngine.getHealthStatus();
                res.writeHead(health.status === 'ONLINE' ? 200 : 503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(health, null, 2));
                return;
            }
            if (pathname === '/api/visioncore/styles' && method === 'GET') {
                const styles = defaultEngine.getOrchestrator().styleMemory.listSupportedStyles();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ count: styles.length, styles }, null, 2));
                return;
            }
            if (pathname === '/api/visioncore/logs' && method === 'GET') {
                const history = VisionCoreLogger.getHistory();
                const quarantined = VisionCoreLogger.getQuarantinedErrors();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ totalLogs: history.length, quarantinedErrors: quarantined.length, logs: history.slice(-50), quarantined }, null, 2));
                return;
            }
            if (pathname === '/api/visioncore/process' && method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', async () => {
                    try {
                        const payload = JSON.parse(body || '{}');
                        const directive = payload.directive;
                        if (!directive || typeof directive !== 'string') {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Missing or invalid "directive" string in request body' }));
                            return;
                        }
                        const options = payload.options || {};
                        const result = await defaultEngine.processDirective(directive, options);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(result, null, 2));
                    }
                    catch (err) {
                        const msg = err instanceof Error ? err.message : String(err);
                        logger.error(`Failed to process directive via HTTP API: ${msg}`, err);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Internal VisionCore Processing Error', details: msg }));
                    }
                });
                return;
            }
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Endpoint not found: ${method} ${pathname}` }));
        }
        catch (err) {
            logger.error('Unhandled server exception', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
    });
    server.listen(port, () => {
        logger.info(`VisionCore Cloud Run HTTP Service running on port ${port}`);
    });
    return server;
}
// Auto-start server if executed directly or in Cloud Run container
const isDirectExecution = process.argv[1] && (process.argv[1].endsWith('index.js') ||
    process.argv[1].endsWith('index.ts') ||
    process.env.K_SERVICE !== undefined || // Google Cloud Run environment variable
    process.env.CONTAINER === 'true');
if (isDirectExecution) {
    const port = Number(process.env.PORT) || 8080;
    startVisionCoreServer(port);
}
