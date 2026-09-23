/**
 * @file index.ts
 * @description Primary entrypoint for @primordiaos/spatial-memory-engine.
 * Exports the complete engine substrate and launches Cloud Run HTTP microservice.
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { SpatialMemoryEngine } from './core/SpatialMemoryEngine.js';

// Core exports
export { SpatialMemoryEngine } from './core/SpatialMemoryEngine.js';
export { SpatialMemoryBoot } from './core/SpatialMemoryBoot.js';
export type { BootContext } from './core/SpatialMemoryBoot.js';
export { SpatialMemoryShutdown } from './core/SpatialMemoryShutdown.js';
export type { ShutdownResult } from './core/SpatialMemoryShutdown.js';

// Realm exports
export { RealmMap } from './realm/RealmMap.js';
export type { RealmDefinition, RealmAdjacencyEdge } from './realm/RealmMap.js';

// Graph exports
export { MemoryNode } from './graph/MemoryNode.js';
export type {
  SpatialVector3,
  MemoryNodeType,
  QuarantineStatus,
  MemoryNodeData,
  CreateMemoryNodeParams,
} from './graph/MemoryNode.js';
export { MemoryEdge } from './graph/MemoryEdge.js';
export type {
  MemoryEdgeType,
  MemoryEdgeData,
  CreateMemoryEdgeParams,
} from './graph/MemoryEdge.js';
export { MemoryGraphEngine } from './graph/MemoryGraphEngine.js';
export type { GraphMetrics } from './graph/MemoryGraphEngine.js';

// Indexer exports
export { SpatialIndexer } from './indexers/SpatialIndexer.js';
export type {
  SpatialCluster,
  NearestNeighborResult,
} from './indexers/SpatialIndexer.js';
export { TemporalIndexer } from './indexers/TemporalIndexer.js';
export type {
  TemporalCluster,
} from './indexers/TemporalIndexer.js';

// Semantic exports
export { SemanticMapper } from './semantic/SemanticMapper.js';
export type {
  SemanticCategory,
} from './semantic/SemanticMapper.js';

// Query exports
export { SpatialQueryEngine } from './query/SpatialQueryEngine.js';
export type {
  QueryOptions,
  QueryResult,
  ScoredMemoryNode,
  SpatialFilter,
  TemporalFilter,
  SemanticFilter,
} from './query/SpatialQueryEngine.js';

// Sync exports
export { ContextSyncEngine } from './sync/ContextSyncEngine.js';
export type {
  SubsystemId,
  ContextSnapshot,
  ContextConflict,
  CoherenceMetrics,
} from './sync/ContextSyncEngine.js';

// Persistence exports
export { MemoryPersistenceLayer } from './persistence/MemoryPersistenceLayer.js';
export type {
  StorageManifest,
  WalEntry,
  LoadedState,
} from './persistence/MemoryPersistenceLayer.js';

// Safety & Logging exports
export { MemorySafetyLayer } from './safety/MemorySafetyLayer.js';
export type { SafetyPolicy } from './safety/MemorySafetyLayer.js';
export { MemoryLogger } from './logging/MemoryLogger.js';
export type {
  LogLevel,
  LogEntry,
} from './logging/MemoryLogger.js';

export default SpatialMemoryEngine;

// ============================================================================
// Cloud Run HTTP Microservice Daemon
// ============================================================================

async function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Primordia-Key',
  });
  res.end(json);
}

export async function startServer(port = Number(process.env['PORT']) || 8080): Promise<void> {
  const engine = new SpatialMemoryEngine();
  await engine.boot();

  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Primordia-Key',
      });
      res.end();
      return;
    }

    try {
      // 1. Healthcheck probe (Cloud Run liveness / readiness)
      if (req.method === 'GET' && (url.pathname === '/healthz' || url.pathname === '/health')) {
        sendJson(res, 200, { status: 'HEALTHY', online: engine.isOnline(), timestamp: Date.now() });
        return;
      }

      // 2. Engine Status
      if (req.method === 'GET' && url.pathname === '/api/status') {
        sendJson(res, 200, engine.getStatus());
        return;
      }

      // 3. List Realms
      if (req.method === 'GET' && url.pathname === '/api/realms') {
        sendJson(res, 200, { realms: engine.realmMap.getAllRealms() });
        return;
      }

      // 4. Create Memory Node
      if (req.method === 'POST' && url.pathname === '/api/memory/create') {
        const body = await parseJsonBody(req);
        const node = await engine.createNode(body);
        sendJson(res, 201, { success: true, node: node.toJSON() });
        return;
      }

      // 5. Link Memory Nodes (Edge)
      if (req.method === 'POST' && url.pathname === '/api/memory/link') {
        const body = await parseJsonBody(req);
        const edge = await engine.linkNodes(body);
        sendJson(res, 201, { success: true, edge: edge.toJSON() });
        return;
      }

      // 6. Query Engine
      if (req.method === 'POST' && url.pathname === '/api/query') {
        const body = await parseJsonBody(req);
        const queryResult = engine.query(body);
        sendJson(res, 200, queryResult);
        return;
      }

      // 7. Context Sync Broadcast
      if (req.method === 'POST' && url.pathname === '/api/sync') {
        const body = await parseJsonBody(req);
        const snapshot = engine.syncContext(
          body.subsystemId,
          body.activeRealmId,
          body.payload || {},
          body.focusTargetId
        );
        sendJson(res, 200, { success: true, snapshot });
        return;
      }

      // 8. Spatial Clusters
      if (req.method === 'GET' && url.pathname === '/api/clusters/spatial') {
        const radius = Number(url.searchParams.get('radius')) || 150;
        const minSize = Number(url.searchParams.get('minSize')) || 2;
        const clusters = engine.getSpatialClusters(radius, minSize);
        sendJson(res, 200, { clusters });
        return;
      }

      // 9. Temporal Bursts
      if (req.method === 'GET' && url.pathname === '/api/clusters/temporal') {
        const delta = Number(url.searchParams.get('deltaMs')) || 60_000;
        const minSize = Number(url.searchParams.get('minSize')) || 2;
        const bursts = engine.getTemporalBursts(delta, minSize);
        sendJson(res, 200, { bursts });
        return;
      }

      // 10. Manual Flush to Snapshot
      if (req.method === 'POST' && url.pathname === '/api/flush') {
        await engine.flushToSnapshot();
        sendJson(res, 200, { success: true, message: 'Snapshot and manifest committed to disk' });
        return;
      }

      sendJson(res, 404, { error: 'Route not found', path: url.pathname });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendJson(res, 500, { error: msg });
    }
  });

  server.listen(port, '0.0.0.0', () => {
    engine.logger.info(`PrimordiaOS Spatial Memory Engine listening on port ${port}`);
  });

  // Graceful shutdown handlers
  const handleExit = async (signal: string) => {
    engine.logger.info(`Received ${signal}. Shutting down spatial memory server...`);
    server.close();
    try {
      await engine.shutdown();
      process.exit(0);
    } catch (err) {
      engine.logger.error('Error during shutdown', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => handleExit('SIGTERM'));
  process.on('SIGINT', () => handleExit('SIGINT'));
}

// Auto-start server if launched directly
const isDirectRun = process.argv[1] && (
  fileURLToPath(import.meta.url) === process.argv[1] ||
  process.argv[1].endsWith('dist/index.js') ||
  process.argv[1].endsWith('src/index.ts')
);

if (isDirectRun) {
  startServer().catch(err => {
    process.stderr.write(`Fatal failure during startup: ${err.message}\n`);
    process.exit(1);
  });
}
