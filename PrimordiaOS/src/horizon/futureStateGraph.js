// horizon/futureStateGraph.ts
export class FutureStateGraph {
    nodes = new Map();
    addProjectedState(state) {
        const nodeId = state.id;
        if (!this.nodes.has(nodeId)) {
            this.nodes.set(nodeId, {
                id: nodeId,
                state,
                neighbors: [],
            });
        }
        else {
            const existing = this.nodes.get(nodeId);
            existing.state = state;
        }
    }
    linkStates(fromId, toId) {
        const from = this.nodes.get(fromId);
        const to = this.nodes.get(toId);
        if (!from || !to)
            return;
        if (!from.neighbors.includes(toId)) {
            from.neighbors.push(toId);
        }
    }
    getNode(id) {
        return this.nodes.get(id);
    }
    getAllNodes() {
        return Array.from(this.nodes.values());
    }
    findMostPromisingState() {
        const nodes = this.getAllNodes();
        if (nodes.length === 0)
            return null;
        let best = null;
        for (const node of nodes) {
            if (!best ||
                node.state.projectedGlobalHealthScore >
                    best.state.projectedGlobalHealthScore) {
                best = node;
            }
        }
        return best;
    }
}
