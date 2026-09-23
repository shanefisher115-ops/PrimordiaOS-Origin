import { ExecutionNode } from './ExecutionNode.js';
import { ExecutionEdge } from './ExecutionEdge.js';
import { ExecutionEdgeDefinition, ExecutionNodeConfig, NodeExecutionTrace } from '../core/types.js';

export interface GraphValidationResult {
  valid: boolean;
  hasCycle: boolean;
  deadlockNodes: string[];
  orphanEdges: string[];
  errors: string[];
}

export class ExecutionGraphEngine {
  private nodes: Map<string, ExecutionNode> = new Map();
  private edges: ExecutionEdge[] = [];
  private runHistory: Map<string, Record<string, NodeExecutionTrace>> = new Map();

  constructor(nodes?: ExecutionNodeConfig[], edges?: ExecutionEdgeDefinition[]) {
    if (nodes) {
      for (const nodeConfig of nodes) {
        this.addNode(new ExecutionNode(nodeConfig));
      }
    }
    if (edges) {
      for (const edgeDef of edges) {
        this.addEdge(new ExecutionEdge(edgeDef));
      }
    }
  }

  public addNode(node: ExecutionNode): void {
    if (this.nodes.has(node.id)) {
      throw new Error(`ExecutionGraphEngine: Duplicate node identifier '${node.id}'`);
    }
    this.nodes.set(node.id, node);
  }

  public addEdge(edge: ExecutionEdge): void {
    if (!this.nodes.has(edge.fromNodeId)) {
      throw new Error(`ExecutionGraphEngine: Edge source node '${edge.fromNodeId}' does not exist.`);
    }
    if (!this.nodes.has(edge.toNodeId)) {
      throw new Error(`ExecutionGraphEngine: Edge target node '${edge.toNodeId}' does not exist.`);
    }
    this.edges.push(edge);
  }

  public getNode(id: string): ExecutionNode | undefined {
    return this.nodes.get(id);
  }

  public getAllNodes(): ExecutionNode[] {
    return Array.from(this.nodes.values());
  }

  public getAllEdges(): ExecutionEdge[] {
    return [...this.edges];
  }

  public getOutgoingEdges(nodeId: string): ExecutionEdge[] {
    return this.edges.filter((e) => e.fromNodeId === nodeId);
  }

  public getIncomingEdges(nodeId: string): ExecutionEdge[] {
    return this.edges.filter((e) => e.toNodeId === nodeId);
  }

  public getParentNodeIds(nodeId: string): string[] {
    return this.getIncomingEdges(nodeId).map((e) => e.fromNodeId);
  }

  public getChildNodeIds(nodeId: string): string[] {
    return this.getOutgoingEdges(nodeId).map((e) => e.toNodeId);
  }

  /**
   * Detects cycles in the graph using Depth First Search (three-color algorithm).
   * 0 = UNVISITED (white), 1 = VISITING (gray), 2 = VISITED (black)
   */
  public detectCycles(): { hasCycle: boolean; cyclePath: string[] } {
    const state = new Map<string, number>();
    const parentMap = new Map<string, string>();
    let cyclePath: string[] = [];

    for (const nodeId of this.nodes.keys()) {
      state.set(nodeId, 0);
    }

    const dfs = (nodeId: string): boolean => {
      state.set(nodeId, 1);

      const children = this.getChildNodeIds(nodeId);
      for (const childId of children) {
        const childState = state.get(childId) ?? 0;
        if (childState === 1) {
          // Cycle found
          cyclePath = [childId, nodeId];
          let curr = nodeId;
          while (curr && curr !== childId && parentMap.has(curr)) {
            curr = parentMap.get(curr)!;
            cyclePath.push(curr);
          }
          cyclePath.reverse();
          return true;
        }
        if (childState === 0) {
          parentMap.set(childId, nodeId);
          if (dfs(childId)) {
            return true;
          }
        }
      }

      state.set(nodeId, 2);
      return false;
    };

    for (const nodeId of this.nodes.keys()) {
      if (state.get(nodeId) === 0) {
        if (dfs(nodeId)) {
          return { hasCycle: true, cyclePath };
        }
      }
    }

    return { hasCycle: false, cyclePath: [] };
  }

  /**
   * Detects deadlock configurations where mutual dependencies or unresolved
   * circular paths render a subset of nodes permanently un-executable.
   */
  public detectDeadlocks(): string[] {
    const inDegrees = new Map<string, number>();
    for (const nodeId of this.nodes.keys()) {
      inDegrees.set(nodeId, 0);
    }

    for (const edge of this.edges) {
      inDegrees.set(edge.toNodeId, (inDegrees.get(edge.toNodeId) ?? 0) + 1);
    }

    const queue: string[] = [];
    for (const [nodeId, deg] of inDegrees.entries()) {
      if (deg === 0) {
        queue.push(nodeId);
      }
    }

    let processedCount = 0;
    const reachable = new Set<string>();

    while (queue.length > 0) {
      const curr = queue.shift()!;
      reachable.add(curr);
      processedCount++;

      for (const childId of this.getChildNodeIds(curr)) {
        const newDeg = (inDegrees.get(childId) ?? 0) - 1;
        inDegrees.set(childId, newDeg);
        if (newDeg === 0) {
          queue.push(childId);
        }
      }
    }

    if (processedCount < this.nodes.size) {
      const deadlocked: string[] = [];
      for (const nodeId of this.nodes.keys()) {
        if (!reachable.has(nodeId)) {
          deadlocked.push(nodeId);
        }
      }
      return deadlocked;
    }

    return [];
  }

  /**
   * Computes topological wavefront levels for parallel execution.
   * Level 0 contains all root nodes with in-degree 0.
   * Level N contains nodes whose parents all reside in levels < N.
   */
  public computeExecutionWavefronts(): ExecutionNode[][] {
    const cycleCheck = this.detectCycles();
    if (cycleCheck.hasCycle) {
      throw new Error(`Cannot compute wavefronts: Cycle detected in graph (${cycleCheck.cyclePath.join(' -> ')})`);
    }

    const inDegrees = new Map<string, number>();
    const nodeLevels = new Map<string, number>();

    for (const nodeId of this.nodes.keys()) {
      inDegrees.set(nodeId, 0);
      nodeLevels.set(nodeId, 0);
    }

    for (const edge of this.edges) {
      inDegrees.set(edge.toNodeId, (inDegrees.get(edge.toNodeId) ?? 0) + 1);
    }

    const queue: string[] = [];
    for (const [nodeId, deg] of inDegrees.entries()) {
      if (deg === 0) {
        queue.push(nodeId);
        nodeLevels.set(nodeId, 0);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentLevel = nodeLevels.get(current) ?? 0;

      for (const childId of this.getChildNodeIds(current)) {
        const childLevel = Math.max(nodeLevels.get(childId) ?? 0, currentLevel + 1);
        nodeLevels.set(childId, childLevel);

        const newDeg = (inDegrees.get(childId) ?? 0) - 1;
        inDegrees.set(childId, newDeg);
        if (newDeg === 0) {
          queue.push(childId);
        }
      }
    }

    // Group into levels
    const maxLevel = Math.max(0, ...Array.from(nodeLevels.values()));
    const levels: ExecutionNode[][] = Array.from({ length: maxLevel + 1 }, () => []);

    for (const [nodeId, level] of nodeLevels.entries()) {
      const node = this.nodes.get(nodeId);
      if (node) {
        levels[level].push(node);
      }
    }

    return levels.filter((lvl) => lvl.length > 0);
  }

  public validate(): GraphValidationResult {
    const errors: string[] = [];
    const orphanEdges: string[] = [];

    for (const edge of this.edges) {
      if (!this.nodes.has(edge.fromNodeId)) {
        orphanEdges.push(`From node '${edge.fromNodeId}' missing for edge ${edge.id}`);
      }
      if (!this.nodes.has(edge.toNodeId)) {
        orphanEdges.push(`To node '${edge.toNodeId}' missing for edge ${edge.id}`);
      }
    }

    const cycleResult = this.detectCycles();
    if (cycleResult.hasCycle) {
      errors.push(`Cycle detected along path: ${cycleResult.cyclePath.join(' -> ')}`);
    }

    const deadlocks = this.detectDeadlocks();
    if (deadlocks.length > 0) {
      errors.push(`Deadlock configuration found in nodes: ${deadlocks.join(', ')}`);
    }

    return {
      valid: errors.length === 0 && orphanEdges.length === 0,
      hasCycle: cycleResult.hasCycle,
      deadlockNodes: deadlocks,
      orphanEdges,
      errors: [...errors, ...orphanEdges],
    };
  }

  public recordTrace(runId: string): Record<string, NodeExecutionTrace> {
    const traces: Record<string, NodeExecutionTrace> = {};
    for (const [id, node] of this.nodes.entries()) {
      traces[id] = node.getTrace();
    }
    this.runHistory.set(runId, traces);
    return traces;
  }

  public getTrace(runId: string): Record<string, NodeExecutionTrace> | undefined {
    return this.runHistory.get(runId);
  }

  public resetAllNodes(): void {
    for (const node of this.nodes.values()) {
      node.reset();
    }
  }
}
