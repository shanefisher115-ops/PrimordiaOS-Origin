export class MemoryGraph {
    nodes = [];
    edges = [];
    getCorrelations() {
        return [];
    }
    getRealmStats() {
        return [];
    }
    getAllNodes() {
        return this.nodes;
    }
}
export const memoryGraph = new MemoryGraph();
