/**
 * @file SpatialMemoryEngine.ts
 * @description Master coordinator of the PrimordiaOS Spatial Memory Subsystem.
 * Unifies 3D spatial indexing, chronological timelines, semantic ontology,
 * graph topologies, real-time context synchronization, and atomic persistence.
 */

import { MemoryLogger } from '../logging/MemoryLogger.js';
import { MemorySafetyLayer } from '../safety/MemorySafetyLayer.js';
import { MemoryGraphEngine, GraphMetrics } from '../graph/MemoryGraphEngine.js';
import { MemoryNode, CreateMemoryNodeParams, SpatialVector3 } from '../graph/MemoryNode.js';
import { MemoryEdge, CreateMemoryEdgeParams } from '../graph/MemoryEdge.js';
import { RealmMap, RealmDefinition } from '../realm/RealmMap.js';
import { SpatialIndexer, SpatialCluster } from '../indexers/SpatialIndexer.js';
import { TemporalIndexer, TemporalCluster } from '../indexers/TemporalIndexer.js';
import { SemanticMapper } from '../semantic/SemanticMapper.js';
import { SpatialQueryEngine, QueryOptions, QueryResult, ScoredMemoryNode } from '../query/SpatialQueryEngine.js';
import { ContextSyncEngine, SubsystemId, ContextSnapshot, CoherenceMetrics } from '../sync/ContextSyncEngine.js';
import { MemoryPersistenceLayer } from '../persistence/MemoryPersistenceLayer.js';
import { SpatialMemoryBoot, BootContext } from './SpatialMemoryBoot.js';
import { SpatialMemoryShutdown, ShutdownResult } from './SpatialMemoryShutdown.js';

export interface SpatialMemoryEngineStatus {
  online: boolean;
  uptimeSeconds: number;
  totalNodes: number;
  totalEdges: number;
  quarantinedNodes: number;
  realmsCount: number;
  graphMetrics: GraphMetrics;
  coherenceMetrics: CoherenceMetrics;
  storagePath: string;
}

export class SpatialMemoryEngine {
  private online = false;
  private startTime = 0;
  private autoSaveTimer: NodeJS.Timeout | null = null;

  public logger!: MemoryLogger;
  public safety!: MemorySafetyLayer;
  public graph!: MemoryGraphEngine;
  public realmMap!: RealmMap;
  public spatialIndexer!: SpatialIndexer;
  public temporalIndexer!: TemporalIndexer;
  public semanticMapper!: SemanticMapper;
  public queryEngine!: SpatialQueryEngine;
  public syncEngine!: ContextSyncEngine;
  public persistence!: MemoryPersistenceLayer;

  constructor() {
    // Initialized during boot
  }

  public async boot(): Promise<void> {
    if (this.online) {
      return;
    }

    const bootExecutor = new SpatialMemoryBoot();
    const context: BootContext = await bootExecutor.executeBoot();

    this.logger = context.logger;
    this.safety = context.safety;
    this.graph = context.graph;
    this.realmMap = context.realmMap;
    this.spatialIndexer = context.spatialIndexer;
    this.temporalIndexer = context.temporalIndexer;
    this.semanticMapper = context.semanticMapper;
    this.queryEngine = context.queryEngine;
    this.syncEngine = context.syncEngine;
    this.persistence = context.persistence;

    this.online = true;
    this.startTime = Date.now();

    // Start auto-snapshot periodic flush (every 5 minutes default)
    this.autoSaveTimer = setInterval(async () => {
      try {
        await this.flushToSnapshot();
      } catch (err) {
        this.logger.error('Background auto-snapshot flush failed', err);
      }
    }, 5 * 60 * 1000);
  }

  public async shutdown(): Promise<ShutdownResult> {
    if (!this.online) {
      throw new Error('SpatialMemoryEngine is not online');
    }

    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }

    const shutdownExecutor = new SpatialMemoryShutdown(this.logger);
    const result = await shutdownExecutor.executeShutdown(
      this.graph,
      this.persistence,
      this.realmMap,
      this.syncEngine
    );

    this.online = false;
    return result;
  }

  public isOnline(): boolean {
    return this.online;
  }

  public ensureOnline(): void {
    if (!this.online) {
      throw new Error('SpatialMemoryEngine is offline. Call boot() first.');
    }
  }

  public async createNode(params: CreateMemoryNodeParams): Promise<MemoryNode> {
    this.ensureOnline();

    // If realmId is not explicitly specified or default, find containing or nearest realm
    let targetRealmId = params.realmId;
    if (!targetRealmId || targetRealmId === 'auto') {
      const containing = this.realmMap.findContainingRealm(params.coordinates);
      if (containing) {
        targetRealmId = containing.realmId;
      } else {
        const nearest = this.realmMap.findNearestRealm(params.coordinates);
        targetRealmId = nearest ? nearest.realm.realmId : 'sovereign_core';
      }
    }

    const node = new MemoryNode({
      ...params,
      realmId: targetRealmId,
    });

    // Semantic feature extraction & classification
    this.semanticMapper.enrichNode(node);

    // Add to graph & indexers
    this.graph.addNode(node);
    this.spatialIndexer.indexNode(node);
    this.temporalIndexer.indexNode(node);

    // Append mutation to WAL
    await this.persistence.appendWal('ADD_NODE', node.toJSON());

    return node;
  }

  public async removeNode(nodeId: string): Promise<boolean> {
    this.ensureOnline();

    const removed = this.graph.removeNode(nodeId);
    if (removed) {
      this.spatialIndexer.unindexNode(nodeId);
      this.temporalIndexer.unindexNode(nodeId);
      await this.persistence.appendWal('REMOVE_NODE', nodeId);
    }
    return removed;
  }

  public async linkNodes(params: CreateMemoryEdgeParams): Promise<MemoryEdge> {
    this.ensureOnline();

    const edge = new MemoryEdge(params);
    this.graph.addEdge(edge);

    await this.persistence.appendWal('ADD_EDGE', edge.toJSON());
    return edge;
  }

  public async unlinkNodes(edgeId: string): Promise<boolean> {
    this.ensureOnline();

    const removed = this.graph.removeEdge(edgeId);
    if (removed) {
      await this.persistence.appendWal('REMOVE_EDGE', edgeId);
    }
    return removed;
  }

  public query(options: QueryOptions): QueryResult {
    this.ensureOnline();
    return this.queryEngine.query(options);
  }

  public searchSpatial(center: SpatialVector3, radius: number, limit?: number): ScoredMemoryNode[] {
    this.ensureOnline();
    return this.queryEngine.searchSpatial(center, radius, limit);
  }

  public searchTemporal(fromMs: number, toMs: number, limit?: number): ScoredMemoryNode[] {
    this.ensureOnline();
    return this.queryEngine.searchTemporal(fromMs, toMs, limit);
  }

  public searchSemantic(queryText: string, minSimilarity?: number, limit?: number): ScoredMemoryNode[] {
    this.ensureOnline();
    return this.queryEngine.searchSemantic(queryText, minSimilarity, limit);
  }

  public syncContext(
    subsystemId: SubsystemId,
    activeRealmId: string,
    payload: Record<string, unknown>,
    focusTargetId?: string
  ): ContextSnapshot {
    this.ensureOnline();
    return this.syncEngine.broadcastContext(subsystemId, activeRealmId, payload, focusTargetId);
  }

  public getSpatialClusters(clusterRadius?: number, minClusterSize?: number): SpatialCluster[] {
    this.ensureOnline();
    return this.spatialIndexer.computeClusters(clusterRadius, minClusterSize);
  }

  public getTemporalBursts(maxDeltaBetweenNodesMs?: number, minNodesPerBurst?: number): TemporalCluster[] {
    this.ensureOnline();
    return this.temporalIndexer.computeBursts(maxDeltaBetweenNodesMs, minNodesPerBurst);
  }

  public async flushToSnapshot(): Promise<void> {
    this.ensureOnline();
    const nodes = this.graph.getAllNodes().map(n => n.toJSON());
    const edges = this.graph.getAllEdges().map(e => e.toJSON());
    await this.persistence.saveSnapshot(nodes, edges);
  }

  public getStatus(): SpatialMemoryEngineStatus {
    const online = this.online;
    const uptimeSeconds = online ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
    const totalNodes = online ? this.graph.getAllNodes().length : 0;
    const totalEdges = online ? this.graph.getAllEdges().length : 0;
    const quarantinedNodes = online ? this.safety.getAllQuarantined().length : 0;
    const realmsCount = online ? this.realmMap.getAllRealms().length : 0;
    const graphMetrics = online
      ? this.graph.getGraphMetrics()
      : {
          nodeCount: 0,
          edgeCount: 0,
          graphDensity: 0,
          edgeTypeDistribution: {
            semantic: 0,
            temporal: 0,
            spatial: 0,
            causal: 0,
            subordinate: 0,
            correlative: 0,
          },
          averageDegree: 0,
        };
    const coherenceMetrics = online
      ? this.syncEngine.getCoherenceMetrics()
      : {
          synchronizedSubsystems: 0,
          totalBroadcasts: 0,
          conflictsDetected: 0,
          conflictsResolved: 0,
          vectorClocks: {
            KERNEL: 0,
            COCKPIT: 0,
            VISION_CORE: 0,
            MONEYPLUGHUB: 0,
            UNREAL_BRIDGE: 0,
          },
        };

    return {
      online,
      uptimeSeconds,
      totalNodes,
      totalEdges,
      quarantinedNodes,
      realmsCount,
      graphMetrics,
      coherenceMetrics,
      storagePath: online ? this.persistence.getStoragePath() : '',
    };
  }
}
