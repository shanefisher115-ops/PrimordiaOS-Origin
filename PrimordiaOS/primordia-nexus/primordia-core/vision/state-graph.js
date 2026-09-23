// vision/state-graph.ts
// PrimordiaOS State Graph — full implementation
// Graph-based spatial memory + temporal linking
export class StateGraph {
    nodes;
    edges;
    constructor() {
        this.nodes = new Map();
        this.edges = [];
    }
    addNode(node) {
        this.nodes.set(node.id, node);
        // Auto-link to previous node (temporal continuity)
        const lastNode = this.getLastNode();
        if (lastNode) {
            this.addEdge({
                from: lastNode.id,
                to: node.id,
                weight: this.computeTemporalWeight(lastNode.ts, node.ts)
            });
        }
        return node;
    }
    addEdge(edge) {
        this.edges.push(edge);
    }
    getNodes() {
        return Array.from(this.nodes.values());
    }
    getEdges() {
        return this.edges;
    }
    getLastNode() {
        if (this.nodes.size === 0)
            return null;
        const sorted = Array.from(this.nodes.values()).sort((a, b) => b.ts - a.ts);
        return sorted[0];
    }
    computeTemporalWeight(ts1, ts2) {
        const delta = Math.abs(ts2 - ts1);
        return Math.max(1, 10000 / (delta + 1)); // closer timestamps = stronger link
    }
}
