/**
 * @file MemoryGraphEngine.ts
 * @description Graph topology engine maintaining nodes, directed edges, and subgraphs
 * (semantic, temporal, spatial) in PrimordiaOS.
 */

import { MemoryNode } from './MemoryNode.js';
import { MemoryEdge, MemoryEdgeType } from './MemoryEdge.js';
import { MemorySafetyLayer } from '../safety/MemorySafetyLayer.js';
import { MemoryLogger } from '../logging/MemoryLogger.js';

export interface GraphMetrics {
  nodeCount: number;
  edgeCount: number;
  graphDensity: number;
  edgeTypeDistribution: Record<MemoryEdgeType, number>;
  averageDegree: number;
}

export class MemoryGraphEngine {
  private readonly nodes: Map<string, MemoryNode> = new Map();
  private readonly edges: Map<string, MemoryEdge> = new Map();
  // nodeId -> Set of edgeIds where nodeId is source
  private readonly outAdjacency: Map<string, Set<string>> = new Map();
  // nodeId -> Set of edgeIds where nodeId is target
  private readonly inAdjacency: Map<string, Set<string>> = new Map();

  private readonly safety: MemorySafetyLayer;
  private readonly logger: MemoryLogger;

  constructor(safety?: MemorySafetyLayer, logger?: MemoryLogger) {
    this.safety = safety ?? new MemorySafetyLayer();
    this.logger = logger ?? new MemoryLogger({ component: 'MemoryGraphEngine' });
  }

  public addNode(node: MemoryNode): void {
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

  public removeNode(id: string): boolean {
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

  public getNode(id: string): MemoryNode | undefined {
    const node = this.nodes.get(id);
    if (node) {
      node.recordAccess();
    }
    return node;
  }

  public getAllNodes(): MemoryNode[] {
    return Array.from(this.nodes.values());
  }

  public addEdge(edge: MemoryEdge): void {
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

  public removeEdge(id: string): boolean {
    const edge = this.edges.get(id);
    if (!edge) {
      return false;
    }

    this.outAdjacency.get(edge.sourceId)?.delete(id);
    this.inAdjacency.get(edge.targetId)?.delete(id);
    this.edges.delete(id);

    return true;
  }

  public getEdge(id: string): MemoryEdge | undefined {
    return this.edges.get(id);
  }

  public getAllEdges(): MemoryEdge[] {
    return Array.from(this.edges.values());
  }

  public getEdgesForNode(
    nodeId: string,
    direction: 'outgoing' | 'incoming' | 'both' = 'both'
  ): MemoryEdge[] {
    const edgeIds = new Set<string>();

    if (direction === 'outgoing' || direction === 'both') {
      const outSet = this.outAdjacency.get(nodeId);
      if (outSet) {
        for (const id of outSet) edgeIds.add(id);
      }
    }

    if (direction === 'incoming' || direction === 'both') {
      const inSet = this.inAdjacency.get(nodeId);
      if (inSet) {
        for (const id of inSet) edgeIds.add(id);
      }
    }

    const result: MemoryEdge[] = [];
    for (const id of edgeIds) {
      const edge = this.edges.get(id);
      if (edge) result.push(edge);
    }
    return result;
  }

  public getNeighbors(nodeId: string, edgeType?: MemoryEdgeType): MemoryNode[] {
    const outSet = this.outAdjacency.get(nodeId);
    if (!outSet || outSet.size === 0) {
      return [];
    }

    const neighborNodes: MemoryNode[] = [];
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

  public findPath(startId: string, endId: string, maxDepth?: number): string[] | null {
    if (!this.nodes.has(startId) || !this.nodes.has(endId)) {
      return null;
    }
    if (startId === endId) {
      return [startId];
    }

    const limit = Math.min(maxDepth ?? 32, this.safety.getMaxTraversalDepth());
    const queue: Array<{ currentId: string; path: string[] }> = [
      { currentId: startId, path: [startId] },
    ];
    const visited = new Set<string>([startId]);

    while (queue.length > 0) {
      const item = queue.shift()!;
      if (item.path.length > limit) {
        continue;
      }

      const outEdges = this.outAdjacency.get(item.currentId);
      if (!outEdges) continue;

      for (const edgeId of outEdges) {
        const edge = this.edges.get(edgeId);
        if (!edge) continue;

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

  public getSemanticSubgraph(): { nodes: MemoryNode[]; edges: MemoryEdge[] } {
    return this.getSubgraphByType('semantic');
  }

  public getTemporalSubgraph(): { nodes: MemoryNode[]; edges: MemoryEdge[] } {
    return this.getSubgraphByType('temporal');
  }

  public getSpatialSubgraph(): { nodes: MemoryNode[]; edges: MemoryEdge[] } {
    return this.getSubgraphByType('spatial');
  }

  private getSubgraphByType(type: MemoryEdgeType): { nodes: MemoryNode[]; edges: MemoryEdge[] } {
    const matchingEdges: MemoryEdge[] = [];
    const involvedNodeIds = new Set<string>();

    for (const edge of this.edges.values()) {
      if (edge.type === type) {
        matchingEdges.push(edge);
        involvedNodeIds.add(edge.sourceId);
        involvedNodeIds.add(edge.targetId);
      }
    }

    const matchingNodes: MemoryNode[] = [];
    for (const id of involvedNodeIds) {
      const node = this.nodes.get(id);
      if (node) matchingNodes.push(node);
    }

    return { nodes: matchingNodes, edges: matchingEdges };
  }

  public getGraphMetrics(): GraphMetrics {
    const nodeCount = this.nodes.size;
    const edgeCount = this.edges.size;
    const maxEdges = nodeCount > 1 ? nodeCount * (nodeCount - 1) : 1;
    const graphDensity = nodeCount > 1 ? edgeCount / maxEdges : 0;

    const distribution: Record<MemoryEdgeType, number> = {
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
