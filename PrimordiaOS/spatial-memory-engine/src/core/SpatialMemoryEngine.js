/**
 * @file SpatialMemoryEngine.ts
 * @description Master coordinator of the PrimordiaOS Spatial Memory Subsystem.
 * Unifies 3D spatial indexing, chronological timelines, semantic ontology,
 * graph topologies, real-time context synchronization, and atomic persistence.
 */
import { MemoryNode } from '../graph/MemoryNode.js';
import { MemoryEdge } from '../graph/MemoryEdge.js';
import { SpatialMemoryBoot } from './SpatialMemoryBoot.js';
import { SpatialMemoryShutdown } from './SpatialMemoryShutdown.js';
export class SpatialMemoryEngine {
    online = false;
    startTime = 0;
    autoSaveTimer = null;
    logger;
    safety;
    graph;
    realmMap;
    spatialIndexer;
    temporalIndexer;
    semanticMapper;
    queryEngine;
    syncEngine;
    persistence;
    constructor() {
        // Initialized during boot
    }
    async boot() {
        if (this.online) {
            return;
        }
        const bootExecutor = new SpatialMemoryBoot();
        const context = await bootExecutor.executeBoot();
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
            }
            catch (err) {
                this.logger.error('Background auto-snapshot flush failed', err);
            }
        }, 5 * 60 * 1000);
    }
    async shutdown() {
        if (!this.online) {
            throw new Error('SpatialMemoryEngine is not online');
        }
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
        const shutdownExecutor = new SpatialMemoryShutdown(this.logger);
        const result = await shutdownExecutor.executeShutdown(this.graph, this.persistence, this.realmMap, this.syncEngine);
        this.online = false;
        return result;
    }
    isOnline() {
        return this.online;
    }
    ensureOnline() {
        if (!this.online) {
            throw new Error('SpatialMemoryEngine is offline. Call boot() first.');
        }
    }
    async createNode(params) {
        this.ensureOnline();
        // If realmId is not explicitly specified or default, find containing or nearest realm
        let targetRealmId = params.realmId;
        if (!targetRealmId || targetRealmId === 'auto') {
            const containing = this.realmMap.findContainingRealm(params.coordinates);
            if (containing) {
                targetRealmId = containing.realmId;
            }
            else {
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
    async removeNode(nodeId) {
        this.ensureOnline();
        const removed = this.graph.removeNode(nodeId);
        if (removed) {
            this.spatialIndexer.unindexNode(nodeId);
            this.temporalIndexer.unindexNode(nodeId);
            await this.persistence.appendWal('REMOVE_NODE', nodeId);
        }
        return removed;
    }
    async linkNodes(params) {
        this.ensureOnline();
        const edge = new MemoryEdge(params);
        this.graph.addEdge(edge);
        await this.persistence.appendWal('ADD_EDGE', edge.toJSON());
        return edge;
    }
    async unlinkNodes(edgeId) {
        this.ensureOnline();
        const removed = this.graph.removeEdge(edgeId);
        if (removed) {
            await this.persistence.appendWal('REMOVE_EDGE', edgeId);
        }
        return removed;
    }
    query(options) {
        this.ensureOnline();
        return this.queryEngine.query(options);
    }
    searchSpatial(center, radius, limit) {
        this.ensureOnline();
        return this.queryEngine.searchSpatial(center, radius, limit);
    }
    searchTemporal(fromMs, toMs, limit) {
        this.ensureOnline();
        return this.queryEngine.searchTemporal(fromMs, toMs, limit);
    }
    searchSemantic(queryText, minSimilarity, limit) {
        this.ensureOnline();
        return this.queryEngine.searchSemantic(queryText, minSimilarity, limit);
    }
    syncContext(subsystemId, activeRealmId, payload, focusTargetId) {
        this.ensureOnline();
        return this.syncEngine.broadcastContext(subsystemId, activeRealmId, payload, focusTargetId);
    }
    getSpatialClusters(clusterRadius, minClusterSize) {
        this.ensureOnline();
        return this.spatialIndexer.computeClusters(clusterRadius, minClusterSize);
    }
    getTemporalBursts(maxDeltaBetweenNodesMs, minNodesPerBurst) {
        this.ensureOnline();
        return this.temporalIndexer.computeBursts(maxDeltaBetweenNodesMs, minNodesPerBurst);
    }
    async flushToSnapshot() {
        this.ensureOnline();
        const nodes = this.graph.getAllNodes().map(n => n.toJSON());
        const edges = this.graph.getAllEdges().map(e => e.toJSON());
        await this.persistence.saveSnapshot(nodes, edges);
    }
    getStatus() {
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
