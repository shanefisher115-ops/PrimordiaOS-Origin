import http from 'node:http';
import { AntigravityPipelineEngine } from './core/AntigravityPipelineEngine.js';
// Core exports
export { AntigravityPipelineEngine } from './core/AntigravityPipelineEngine.js';
export { PipelineBoot } from './core/PipelineBoot.js';
export { PipelineShutdown } from './core/PipelineShutdown.js';
export * from './core/types.js';
// Subsystem exports
export { PipelineRegistry } from './registry/PipelineRegistry.js';
export { PipelineOrchestrator } from './orchestrator/PipelineOrchestrator.js';
export { MultiAgentRouter } from './router/MultiAgentRouter.js';
export { ExecutionGraphEngine } from './graph/ExecutionGraphEngine.js';
export { ExecutionNode } from './graph/ExecutionNode.js';
export { ExecutionEdge } from './graph/ExecutionEdge.js';
export { PipelineMemoryEngine } from './memory/PipelineMemoryEngine.js';
export { PipelineSafetyLayer } from './safety/PipelineSafetyLayer.js';
export { PipelineLogger } from './logging/PipelineLogger.js';
// Adapters exports
export { AntigravityAdapter } from './adapters/AntigravityAdapter.js';
export { VertexAIAdapter } from './adapters/VertexAIAdapter.js';
export { KernelAdapter } from './adapters/KernelAdapter.js';
/**
 * Cloud Run / Microservice HTTP Daemon Server
 */
export async function startServer(port) {
    const engine = AntigravityPipelineEngine.getInstance();
    const logger = engine.getLogger();
    logger.info('Daemon', 'Starting Antigravity Pipeline Engine daemon...');
    await engine.boot();
    const listenPort = port ?? engine.getConfig().port;
    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const method = req.method?.toUpperCase();
        const pathname = url.pathname;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-Primordia-Engine', 'Antigravity-v1.0.0');
        try {
            // Health / Status Check (Cloud Run)
            if (pathname === '/health' || pathname === '/status') {
                res.writeHead(200);
                res.end(JSON.stringify({
                    status: 'ok',
                    engineState: engine.getState(),
                    activeRuns: engine.getActiveRunCount(),
                    timestamp: new Date().toISOString(),
                }));
                return;
            }
            // Root info
            if (pathname === '/' && method === 'GET') {
                res.writeHead(200);
                res.end(JSON.stringify({
                    service: 'PrimordiaOS Antigravity Pipeline Engine',
                    version: '1.0.0',
                    state: engine.getState(),
                    registeredPipelines: engine.getRegistry().listPipelines().length,
                    endpoints: [
                        'GET /health',
                        'GET /pipelines',
                        'GET /pipelines/:id',
                        'POST /pipelines/:id/run',
                        'GET /runs',
                        'GET /runs/:runId',
                        'GET /memory/snapshot',
                        'GET /safety/quarantined',
                        'GET /logs',
                    ],
                }));
                return;
            }
            // List Pipelines
            if (pathname === '/pipelines' && method === 'GET') {
                const pipelines = engine.getRegistry().listPipelines();
                res.writeHead(200);
                res.end(JSON.stringify({ count: pipelines.length, pipelines }));
                return;
            }
            // Specific Pipeline
            if (pathname.startsWith('/pipelines/') && !pathname.endsWith('/run') && method === 'GET') {
                const pipelineId = pathname.replace('/pipelines/', '');
                const pipeline = engine.getRegistry().getPipeline(pipelineId);
                if (!pipeline) {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: `Pipeline '${pipelineId}' not found` }));
                    return;
                }
                res.writeHead(200);
                res.end(JSON.stringify(pipeline));
                return;
            }
            // Run Pipeline
            if (pathname.startsWith('/pipelines/') && pathname.endsWith('/run') && method === 'POST') {
                const pipelineId = pathname.replace('/pipelines/', '').replace('/run', '');
                let bodyRaw = '';
                req.on('data', (chunk) => {
                    bodyRaw += chunk;
                });
                req.on('end', async () => {
                    try {
                        const body = bodyRaw ? JSON.parse(bodyRaw) : {};
                        const result = await engine.runPipeline(pipelineId, {
                            initialInput: body.initialInput || body.input,
                            idempotencyKey: body.idempotencyKey,
                            traceId: req.headers['x-trace-id'] || body.traceId,
                        });
                        res.writeHead(result.success ? 200 : 500);
                        res.end(JSON.stringify(result));
                    }
                    catch (execErr) {
                        res.writeHead(400);
                        res.end(JSON.stringify({
                            error: execErr instanceof Error ? execErr.message : String(execErr),
                        }));
                    }
                });
                return;
            }
            // List recent runs
            if (pathname === '/runs' && method === 'GET') {
                const runs = engine.getMemory().getRecentExecutions();
                res.writeHead(200);
                res.end(JSON.stringify({ count: runs.length, runs }));
                return;
            }
            // Run Details
            if (pathname.startsWith('/runs/') && method === 'GET') {
                const runId = pathname.replace('/runs/', '');
                const run = engine.getMemory().getExecutionResult(runId);
                if (!run) {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: `Run '${runId}' not found` }));
                    return;
                }
                res.writeHead(200);
                res.end(JSON.stringify(run));
                return;
            }
            // Memory Snapshot
            if (pathname === '/memory/snapshot' && method === 'GET') {
                const snapshot = engine.getMemory().createSnapshot();
                res.writeHead(200);
                res.end(JSON.stringify(snapshot));
                return;
            }
            // Quarantined Entities
            if (pathname === '/safety/quarantined' && method === 'GET') {
                const quarantined = engine.getSafety().getAllQuarantined();
                res.writeHead(200);
                res.end(JSON.stringify({ count: quarantined.length, quarantined }));
                return;
            }
            // Logs
            if (pathname === '/logs' && method === 'GET') {
                const limit = parseInt(url.searchParams.get('limit') || '50', 10);
                const logs = logger.getRecentLogs(limit);
                res.writeHead(200);
                res.end(JSON.stringify({ count: logs.length, logs }));
                return;
            }
            // 404 Route Not Found
            res.writeHead(404);
            res.end(JSON.stringify({ error: `Endpoint '${pathname}' [${method}] not found` }));
        }
        catch (routeErr) {
            logger.error('Daemon', 'Unhandled route exception', routeErr);
            res.writeHead(500);
            res.end(JSON.stringify({
                error: 'Internal Server Error',
                message: routeErr instanceof Error ? routeErr.message : String(routeErr),
            }));
        }
    });
    server.listen(listenPort, '0.0.0.0', () => {
        logger.info('Daemon', `Antigravity Pipeline Engine listening on 0.0.0.0:${listenPort}`);
    });
    // Handle OS signals for graceful shutdown on Cloud Run / Docker
    const gracefulShutdown = async (signal) => {
        logger.info('Daemon', `Received ${signal}. Shutting down HTTP server and engine...`);
        server.close();
        await engine.shutdown();
        process.exit(0);
    };
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    return { server, engine };
}
// Auto-run if started directly via `node dist/index.js`
const isDirectExecution = process.argv[1] &&
    (process.argv[1].endsWith('dist/index.js') ||
        process.argv[1].endsWith('dist\\index.js') ||
        process.argv[1].endsWith('src/index.ts') ||
        process.argv[1].endsWith('src\\index.ts'));
if (isDirectExecution) {
    startServer().catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Failed to start Antigravity Pipeline Engine daemon:', err);
        process.exit(1);
    });
}
