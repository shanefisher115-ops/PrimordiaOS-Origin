/**
 * @file SpatialMemoryShutdown.ts
 * @description Graceful shutdown coordinator for PrimordiaOS Spatial Memory Engine.
 * Flushes active memory graphs, commits atomic persistence snapshots, and broadcasts teardown signals.
 */

import { MemoryLogger } from '../logging/MemoryLogger.js';
import { MemoryGraphEngine } from '../graph/MemoryGraphEngine.js';
import { MemoryPersistenceLayer, StorageManifest } from '../persistence/MemoryPersistenceLayer.js';
import { RealmMap } from '../realm/RealmMap.js';
import { ContextSyncEngine } from '../sync/ContextSyncEngine.js';

export interface ShutdownResult {
  durationMs: number;
  persistedNodes: number;
  persistedEdges: number;
  manifest: StorageManifest;
  success: boolean;
}

export class SpatialMemoryShutdown {
  private readonly logger: MemoryLogger;

  constructor(logger?: MemoryLogger) {
    this.logger = logger ?? new MemoryLogger({ component: 'SpatialMemoryShutdown' });
  }

  public async executeShutdown(
    graph: MemoryGraphEngine,
    persistence: MemoryPersistenceLayer,
    realmMap: RealmMap,
    syncEngine: ContextSyncEngine
  ): Promise<ShutdownResult> {
    const startTime = performance.now();
    this.logger.info('====================================================');
    this.logger.info('PrimordiaOS Spatial Memory Engine :: Initiating Shutdown');
    this.logger.info('====================================================');

    // 1. Broadcast shutdown notification across sync channels
    try {
      syncEngine.broadcastContext('KERNEL', 'sovereign_core', {
        status: 'SHUTTING_DOWN',
        timestamp: Date.now(),
      });
    } catch (err) {
      this.logger.warn('Failed to broadcast shutdown context', { error: String(err) });
    }

    // 2. Persist RealmMap updates
    try {
      await realmMap.saveToFile();
    } catch (err) {
      this.logger.error('Failed to persist RealmMap during shutdown', err);
    }

    // 3. Serialize and commit clean snapshot + manifest
    const nodes = graph.getAllNodes().map(n => n.toJSON());
    const edges = graph.getAllEdges().map(e => e.toJSON());

    const manifest = await persistence.saveSnapshot(nodes, edges);

    const durationMs = Number((performance.now() - startTime).toFixed(2));
    this.logger.info(
      `Shutdown complete in ${durationMs}ms. Persisted ${nodes.length} nodes and ${edges.length} edges.`
    );

    return {
      durationMs,
      persistedNodes: nodes.length,
      persistedEdges: edges.length,
      manifest,
      success: true,
    };
  }
}
