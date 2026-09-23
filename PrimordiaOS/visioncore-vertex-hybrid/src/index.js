/**
 * @primordiaos/visioncore-vertex-hybrid - Main Entrypoint & Subsystem Exports
 * PrimordiaOS VisionCore x Vertex AI Substrate
 */
import { createServer } from 'node:http';
import { VisionCoreVertexHybridEngine } from './core/VisionCoreVertexHybridEngine.js';
import { VisionCoreEngine } from './core/VisionCoreEngine.js';
import { CreativeOrchestrator } from './core/CreativeOrchestrator.js';
import { VertexAIAdapter } from './vertex/VertexAIAdapter.js';
import { VertexAIPipelineRouter } from './vertex/VertexAIPipelineRouter.js';
import { Generator } from './modules/Generator.js';
import { RenderLoop } from './modules/RenderLoop.js';
import { CoreForge } from './modules/CoreForge.js';
import { PulseEngine } from './modules/PulseEngine.js';
import { InnovationGenerator } from './modules/InnovationGenerator.js';
import { HybridSafetyLayer } from './safety/HybridSafetyLayer.js';
import { HybridLogger } from './logging/HybridLogger.js';
// Primary Export as required by specification
export { VisionCoreVertexHybridEngine };
// Secondary Named Exports
export { VisionCoreEngine, CreativeOrchestrator, VertexAIAdapter, VertexAIPipelineRouter, Generator, RenderLoop, CoreForge, PulseEngine, InnovationGenerator, HybridSafetyLayer, HybridLogger };
// Default Export
export default VisionCoreVertexHybridEngine;
/**
 * Cloud Run / Daemon Standalone Server Listener
 * Automatically boots and binds HTTP server when executed as primary module or when PORT is defined
 */
export async function startServer(port = Number(process.env.PORT) || 8080) {
    const engine = new VisionCoreVertexHybridEngine();
    await engine.boot();
    const server = createServer(async (req, res) => {
        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        // Health check endpoint for Cloud Run
        if (url.pathname === '/healthz' || url.pathname === '/') {
            const telemetry = engine.getTelemetry();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'UP',
                service: 'visioncore-vertex-hybrid',
                telemetry
            }, null, 2));
            return;
        }
        // Telemetry endpoint
        if (url.pathname === '/api/telemetry' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(engine.getTelemetry(), null, 2));
            return;
        }
        // Quarantine status endpoint
        if (url.pathname === '/api/quarantine' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                quarantinedErrors: HybridLogger.getQuarantinedErrors()
            }, null, 2));
            return;
        }
        // Execution endpoint
        if (url.pathname === '/api/execute' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
                try {
                    const parsed = JSON.parse(body || '{}');
                    if (!parsed.directive) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Missing "directive" in JSON payload' }));
                        return;
                    }
                    const result = await engine.execute(parsed);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result, null, 2));
                }
                catch (err) {
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: errorMessage }));
                }
            });
            return;
        }
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Path not found: ${url.pathname}` }));
    });
    server.listen(port, () => {
        console.log(`[VisionCoreVertexHybrid] Cloud Run daemon listening on port ${port}`);
    });
    // Graceful shutdown on SIGTERM / SIGINT
    const handleTermination = async (signal) => {
        console.log(`[VisionCoreVertexHybrid] Received ${signal}. Initiating graceful termination.`);
        server.close();
        await engine.shutdown();
        process.exit(0);
    };
    process.on('SIGTERM', () => handleTermination('SIGTERM'));
    process.on('SIGINT', () => handleTermination('SIGINT'));
}
// Auto-run if this script is executed directly or launched as main
const isMainModule = process.argv[1] && (process.argv[1].endsWith('index.js') ||
    process.argv[1].endsWith('index.ts'));
if (isMainModule || process.env.AUTO_START_SERVER === 'true') {
    startServer().catch(err => {
        console.error('[VisionCoreVertexHybrid] Fatal startup failure:', err);
        process.exit(1);
    });
}
