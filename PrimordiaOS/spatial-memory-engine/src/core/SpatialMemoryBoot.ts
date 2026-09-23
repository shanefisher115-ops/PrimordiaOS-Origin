/**
 * @file SpatialMemoryBoot.ts
 * @description Cold-start and initialization boot sequence for PrimordiaOS Spatial Memory Engine.
 * Verifies environment keys, restores persisted graph topology, and warms spatial indexers.
 */

import { MemoryLogger } from '../logging/MemoryLogger.js';
import { MemorySafetyLayer } from '../safety/MemorySafetyLayer.js';
import { MemoryGraphEngine } from '../graph/MemoryGraphEngine.js';
import { MemoryNode } from '../graph/MemoryNode.js';
import { MemoryEdge } from '../graph/MemoryEdge.js';
import { RealmMap } from '../realm/RealmMap.js';
import { SpatialIndexer } from '../indexers/SpatialIndexer.js';
import { TemporalIndexer } from '../indexers/TemporalIndexer.js';
import { SemanticMapper } from '../semantic/SemanticMapper.js';
import { SpatialQueryEngine } from '../query/SpatialQueryEngine.js';
import { ContextSyncEngine } from '../sync/ContextSyncEngine.js';
import { MemoryPersistenceLayer } from '../persistence/MemoryPersistenceLayer.js';

export interface BootContext {
  logger: MemoryLogger;
  safety: MemorySafetyLayer;
  graph: MemoryGraphEngine;
  realmMap: RealmMap;
  spatialIndexer: SpatialIndexer;
  temporalIndexer: TemporalIndexer;
  semanticMapper: SemanticMapper;
  queryEngine: SpatialQueryEngine;
  syncEngine: ContextSyncEngine;
  persistence: MemoryPersistenceLayer;
  bootDurationMs: number;
  recoveredNodes: number;
  recoveredEdges: number;
}

export class SpatialMemoryBoot {
  private readonly logger: MemoryLogger;

  constructor(logger?: MemoryLogger) {
    this.logger = logger ?? new MemoryLogger({ component: 'SpatialMemoryBoot' });
  }

  public async executeBoot(): Promise<BootContext> {
    const startTime = performance.now();
    this.logger.info('====================================================');
    this.logger.info('PrimordiaOS Spatial Memory Engine :: Booting System');
    this.logger.info('====================================================');

    // 1. Validate Environment Variables
    const primordiaKey = process.env['PRIMORDIAOS_KEY'];
    if (!primordiaKey) {
      this.logger.warn(
        'PRIMORDIAOS_KEY not detected. Operating in sovereign local fallback mode.'
      );
    } else {
      this.logger.info('Sovereignty token authenticated for Spatial Memory Engine');
    }

    const memoryPath = process.env['SPATIAL_MEMORY_PATH'] || './data/spatial-memory';
    const realmMapPath = process.env['REALM_MAP_PATH'] || './data/realm-map.json';
    this.logger.info(`Storage Target: ${memoryPath}`);
    this.logger.info(`Realm Map Target: ${realmMapPath}`);

    // 2. Initialize Subsystems
    const safety = new MemorySafetyLayer(undefined, this.logger);
    const graph = new MemoryGraphEngine(safety, this.logger);
    const realmMap = new RealmMap(this.logger);
    const spatialIndexer = new SpatialIndexer(100, this.logger);
    const temporalIndexer = new TemporalIndexer(this.logger);
    const semanticMapper = new SemanticMapper(undefined, this.logger);
    const syncEngine = new ContextSyncEngine(this.logger);
    const persistence = new MemoryPersistenceLayer(memoryPath, this.logger);

    // 3. Load Realm Map
    await realmMap.loadFromFile(realmMapPath);

    // 4. Hydrate Graph State from Persistence (Snapshot + WAL)
    await persistence.initialize();
    const loadedState = await persistence.loadState();

    let recoveredNodes = 0;
    for (const nodeData of loadedState.nodes) {
      try {
        const node = MemoryNode.fromJSON(nodeData);
        semanticMapper.enrichNode(node);
        graph.addNode(node);
        spatialIndexer.indexNode(node);
        temporalIndexer.indexNode(node);
        recoveredNodes += 1;
      } catch (err) {
        this.logger.error(`Failed to hydrate node [${nodeData.id}]`, err);
      }
    }

    let recoveredEdges = 0;
    for (const edgeData of loadedState.edges) {
      try {
        const edge = MemoryEdge.fromJSON(edgeData);
        graph.addEdge(edge);
        recoveredEdges += 1;
      } catch (err) {
        this.logger.error(`Failed to hydrate edge [${edgeData.id}]`, err);
      }
    }

    // 5. Initialize Query Engine
    const queryEngine = new SpatialQueryEngine(
      graph,
      spatialIndexer,
      temporalIndexer,
      semanticMapper,
      realmMap,
      this.logger
    );

    // 6. Broadcast Initial KERNEL Context
    syncEngine.broadcastContext(
      'KERNEL',
      'sovereign_core',
      { status: 'INITIALIZED', recoveredNodes, recoveredEdges },
      'sovereign_core'
    );

    const bootDurationMs = Number((performance.now() - startTime).toFixed(2));
    this.logger.info(
      `Boot sequence complete in ${bootDurationMs}ms (${recoveredNodes} nodes, ${recoveredEdges} edges online)`
    );

    return {
      logger: this.logger,
      safety,
      graph,
      realmMap,
      spatialIndexer,
      temporalIndexer,
      semanticMapper,
      queryEngine,
      syncEngine,
      persistence,
      bootDurationMs,
      recoveredNodes,
      recoveredEdges,
    };
  }
}
