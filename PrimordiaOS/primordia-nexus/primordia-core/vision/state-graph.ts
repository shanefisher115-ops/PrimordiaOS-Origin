// vision/state-graph.ts
// PrimordiaOS State Graph — full implementation
// Graph-based spatial memory + temporal linking

export interface StateNode {
    id: string;
    ts: number;
    data: any;
}

export interface StateEdge {
    from: string;
    to: string;
    weight: number;
}

export class StateGraph {
    private nodes: Map<string, StateNode>;
    private edges: StateEdge[];

    constructor() {
        this.nodes = new Map();
        this.edges = [];
    }

    addNode(node: StateNode): StateNode {
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

    addEdge(edge: StateEdge) {
        this.edges.push(edge);
    }

    getNodes(): StateNode[] {
        return Array.from(this.nodes.values());
    }

    getEdges(): StateEdge[] {
        return this.edges;
    }

    getLastNode(): StateNode | null {
        if (this.nodes.size === 0) return null;

        const sorted = Array.from(this.nodes.values()).sort((a, b) => b.ts - a.ts);
        return sorted[0];
    }

    computeTemporalWeight(ts1: number, ts2: number): number {
        const delta = Math.abs(ts2 - ts1);
        return Math.max(1, 10000 / (delta + 1)); // closer timestamps = stronger link
    }
}
