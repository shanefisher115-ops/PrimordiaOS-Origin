import { ExecutionNode } from './ExecutionNode.js';
import { ExecutionEdge } from './ExecutionEdge.js';
export class ExecutionGraphEngine {
    nodes = new Map();
    edges = [];
    runHistory = new Map();
    constructor(nodes, edges) {
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
    addNode(node) {
        if (this.nodes.has(node.id)) {
            throw new Error(`ExecutionGraphEngine: Duplicate node identifier '${node.id}'`);
        }
        this.nodes.set(node.id, node);
    }
    addEdge(edge) {
        if (!this.nodes.has(edge.fromNodeId)) {
            throw new Error(`ExecutionGraphEngine: Edge source node '${edge.fromNodeId}' does not exist.`);
        }
        if (!this.nodes.has(edge.toNodeId)) {
            throw new Error(`ExecutionGraphEngine: Edge target node '${edge.toNodeId}' does not exist.`);
        }
        this.edges.push(edge);
    }
    getNode(id) {
        return this.nodes.get(id);
    }
    getAllNodes() {
        return Array.from(this.nodes.values());
    }
    getAllEdges() {
        return [...this.edges];
    }
    getOutgoingEdges(nodeId) {
        return this.edges.filter((e) => e.fromNodeId === nodeId);
    }
    getIncomingEdges(nodeId) {
        return this.edges.filter((e) => e.toNodeId === nodeId);
    }
    getParentNodeIds(nodeId) {
        return this.getIncomingEdges(nodeId).map((e) => e.fromNodeId);
    }
    getChildNodeIds(nodeId) {
        return this.getOutgoingEdges(nodeId).map((e) => e.toNodeId);
    }
    /**
     * Detects cycles in the graph using Depth First Search (three-color algorithm).
     * 0 = UNVISITED (white), 1 = VISITING (gray), 2 = VISITED (black)
     */
    detectCycles() {
        const state = new Map();
        const parentMap = new Map();
        let cyclePath = [];
        for (const nodeId of this.nodes.keys()) {
            state.set(nodeId, 0);
        }
        const dfs = (nodeId) => {
            state.set(nodeId, 1);
            const children = this.getChildNodeIds(nodeId);
            for (const childId of children) {
                const childState = state.get(childId) ?? 0;
                if (childState === 1) {
                    // Cycle found
                    cyclePath = [childId, nodeId];
                    let curr = nodeId;
                    while (curr && curr !== childId && parentMap.has(curr)) {
                        curr = parentMap.get(curr);
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
    detectDeadlocks() {
        const inDegrees = new Map();
        for (const nodeId of this.nodes.keys()) {
            inDegrees.set(nodeId, 0);
        }
        for (const edge of this.edges) {
            inDegrees.set(edge.toNodeId, (inDegrees.get(edge.toNodeId) ?? 0) + 1);
        }
        const queue = [];
        for (const [nodeId, deg] of inDegrees.entries()) {
            if (deg === 0) {
                queue.push(nodeId);
            }
        }
        let processedCount = 0;
        const reachable = new Set();
        while (queue.length > 0) {
            const curr = queue.shift();
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
            const deadlocked = [];
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
    computeExecutionWavefronts() {
        const cycleCheck = this.detectCycles();
        if (cycleCheck.hasCycle) {
            throw new Error(`Cannot compute wavefronts: Cycle detected in graph (${cycleCheck.cyclePath.join(' -> ')})`);
        }
        const inDegrees = new Map();
        const nodeLevels = new Map();
        for (const nodeId of this.nodes.keys()) {
            inDegrees.set(nodeId, 0);
            nodeLevels.set(nodeId, 0);
        }
        for (const edge of this.edges) {
            inDegrees.set(edge.toNodeId, (inDegrees.get(edge.toNodeId) ?? 0) + 1);
        }
        const queue = [];
        for (const [nodeId, deg] of inDegrees.entries()) {
            if (deg === 0) {
                queue.push(nodeId);
                nodeLevels.set(nodeId, 0);
            }
        }
        while (queue.length > 0) {
            const current = queue.shift();
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
        const levels = Array.from({ length: maxLevel + 1 }, () => []);
        for (const [nodeId, level] of nodeLevels.entries()) {
            const node = this.nodes.get(nodeId);
            if (node) {
                levels[level].push(node);
            }
        }
        return levels.filter((lvl) => lvl.length > 0);
    }
    validate() {
        const errors = [];
        const orphanEdges = [];
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
    recordTrace(runId) {
        const traces = {};
        for (const [id, node] of this.nodes.entries()) {
            traces[id] = node.getTrace();
        }
        this.runHistory.set(runId, traces);
        return traces;
    }
    getTrace(runId) {
        return this.runHistory.get(runId);
    }
    resetAllNodes() {
        for (const node of this.nodes.values()) {
            node.reset();
        }
    }
}
