/**
 * @file MemoryGraphEngine.ts
 * @description Graph topology engine maintaining nodes, directed edges, and subgraphs
 * (semantic, temporal, spatial) in PrimordiaOS.
 */
import { MemorySafetyLayer } from '../safety/MemorySafetyLayer.js';
import { MemoryLogger } from '../logging/MemoryLogger.js';
export class MemoryGraphEngine {
    nodes = new Map();
    edges = new Map();
    // nodeId -> Set of edgeIds where nodeId is source
    outAdjacency = new Map();
    // nodeId -> Set of edgeIds where nodeId is target
    inAdjacency = new Map();
    safety;
    logger;
    constructor(safety, logger) {
        this.safety = safety ?? new MemorySafetyLayer();
        this.logger = logger ?? new MemoryLogger({ component: 'MemoryGraphEngine' });
    }
    addNode(node) {
        const validation = this.safety.validateNode(node, this.nodes.size);
        if (!validation.valid && !validation.quarantine) {
            throw new Error(`Node validation failed: ${validation.reason}`);
        }
        if (validation.quarantine) {
            node.quarantineStatus = 'quarantined';
            node.quarantineReason = validation.reason;
            this.safety.quarantineNode(node.id, validation.reason ?? 'Safety violation');
        }
        this.nodes.set(node.id, node);
        if (!this.outAdjacency.has(node.id)) {
            this.outAdjacency.set(node.id, new Set());
        }
        if (!this.inAdjacency.has(node.id)) {
            this.inAdjacency.set(node.id, new Set());
        }
        this.logger.debug(`Node indexed in graph: [${node.id}] in realm [${node.realmId}]`, {
            nodeId: node.id,
            realmId: node.realmId,
            type: node.type,
        });
    }
    removeNode(id) {
        if (!this.nodes.has(id)) {
            return false;
        }
        // Remove all associated edges
        const outEdges = Array.from(this.outAdjacency.get(id) || []);
        for (const edgeId of outEdges) {
            this.removeEdge(edgeId);
        }
        const inEdges = Array.from(this.inAdjacency.get(id) || []);
        for (const edgeId of inEdges) {
            this.removeEdge(edgeId);
        }
        this.outAdjacency.delete(id);
        this.inAdjacency.delete(id);
        this.nodes.delete(id);
        this.safety.releaseFromQuarantine(id);
        this.logger.debug(`Node removed from graph: [${id}]`, { nodeId: id });
        return true;
    }
    getNode(id) {
        const node = this.nodes.get(id);
        if (node) {
            node.recordAccess();
        }
        return node;
    }
    getAllNodes() {
        return Array.from(this.nodes.values());
    }
    addEdge(edge) {
        if (!this.nodes.has(edge.sourceId)) {
            throw new Error(`Source node [${edge.sourceId}] does not exist`);
        }
        if (!this.nodes.has(edge.targetId)) {
            throw new Error(`Target node [${edge.targetId}] does not exist`);
        }
        const validation = this.safety.validateEdge(edge, this.edges.size);
        if (!validation.valid) {
            throw new Error(`Edge validation failed: ${validation.reason}`);
        }
        this.edges.set(edge.id, edge);
        let outSet = this.outAdjacency.get(edge.sourceId);
        if (!outSet) {
            outSet = new Set();
            this.outAdjacency.set(edge.sourceId, outSet);
        }
        outSet.add(edge.id);
        let inSet = this.inAdjacency.get(edge.targetId);
        if (!inSet) {
            inSet = new Set();
            this.inAdjacency.set(edge.targetId, inSet);
        }
        inSet.add(edge.id);
        this.logger.debug(`Edge added: [${edge.sourceId}] -> [${edge.targetId}] (${edge.type})`);
    }
    removeEdge(id) {
        const edge = this.edges.get(id);
        if (!edge) {
            return false;
        }
        this.outAdjacency.get(edge.sourceId)?.delete(id);
        this.inAdjacency.get(edge.targetId)?.delete(id);
        this.edges.delete(id);
        return true;
    }
    getEdge(id) {
        return this.edges.get(id);
    }
    getAllEdges() {
        return Array.from(this.edges.values());
    }
    getEdgesForNode(nodeId, direction = 'both') {
        const edgeIds = new Set();
        if (direction === 'outgoing' || direction === 'both') {
            const outSet = this.outAdjacency.get(nodeId);
            if (outSet) {
                for (const id of outSet)
                    edgeIds.add(id);
            }
        }
        if (direction === 'incoming' || direction === 'both') {
            const inSet = this.inAdjacency.get(nodeId);
            if (inSet) {
                for (const id of inSet)
                    edgeIds.add(id);
            }
        }
        const result = [];
        for (const id of edgeIds) {
            const edge = this.edges.get(id);
            if (edge)
                result.push(edge);
        }
        return result;
    }
    getNeighbors(nodeId, edgeType) {
        const outSet = this.outAdjacency.get(nodeId);
        if (!outSet || outSet.size === 0) {
            return [];
        }
        const neighborNodes = [];
        for (const edgeId of outSet) {
            const edge = this.edges.get(edgeId);
            if (edge && (!edgeType || edge.type === edgeType)) {
                const targetNode = this.nodes.get(edge.targetId);
                if (targetNode && targetNode.quarantineStatus !== 'quarantined') {
                    neighborNodes.push(targetNode);
                }
            }
        }
        return neighborNodes;
    }
    findPath(startId, endId, maxDepth) {
        if (!this.nodes.has(startId) || !this.nodes.has(endId)) {
            return null;
        }
        if (startId === endId) {
            return [startId];
        }
        const limit = Math.min(maxDepth ?? 32, this.safety.getMaxTraversalDepth());
        const queue = [
            { currentId: startId, path: [startId] },
        ];
        const visited = new Set([startId]);
        while (queue.length > 0) {
            const item = queue.shift();
            if (item.path.length > limit) {
                continue;
            }
            const outEdges = this.outAdjacency.get(item.currentId);
            if (!outEdges)
                continue;
            for (const edgeId of outEdges) {
                const edge = this.edges.get(edgeId);
                if (!edge)
                    continue;
                const neighborId = edge.targetId;
                if (neighborId === endId) {
                    return [...item.path, neighborId];
                }
                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    queue.push({
                        currentId: neighborId,
                        path: [...item.path, neighborId],
                    });
                }
            }
        }
        return null;
    }
    getSemanticSubgraph() {
        return this.getSubgraphByType('semantic');
    }
    getTemporalSubgraph() {
        return this.getSubgraphByType('temporal');
    }
    getSpatialSubgraph() {
        return this.getSubgraphByType('spatial');
    }
    getSubgraphByType(type) {
        const matchingEdges = [];
        const involvedNodeIds = new Set();
        for (const edge of this.edges.values()) {
            if (edge.type === type) {
                matchingEdges.push(edge);
                involvedNodeIds.add(edge.sourceId);
                involvedNodeIds.add(edge.targetId);
            }
        }
        const matchingNodes = [];
        for (const id of involvedNodeIds) {
            const node = this.nodes.get(id);
            if (node)
                matchingNodes.push(node);
        }
        return { nodes: matchingNodes, edges: matchingEdges };
    }
    getGraphMetrics() {
        const nodeCount = this.nodes.size;
        const edgeCount = this.edges.size;
        const maxEdges = nodeCount > 1 ? nodeCount * (nodeCount - 1) : 1;
        const graphDensity = nodeCount > 1 ? edgeCount / maxEdges : 0;
        const distribution = {
            semantic: 0,
            temporal: 0,
            spatial: 0,
            causal: 0,
            subordinate: 0,
            correlative: 0,
        };
        for (const edge of this.edges.values()) {
            distribution[edge.type] = (distribution[edge.type] || 0) + 1;
        }
        return {
            nodeCount,
            edgeCount,
            graphDensity: Number(graphDensity.toFixed(4)),
            edgeTypeDistribution: distribution,
            averageDegree: nodeCount > 0 ? Number(((edgeCount * 2) / nodeCount).toFixed(2)) : 0,
        };
    }
}
