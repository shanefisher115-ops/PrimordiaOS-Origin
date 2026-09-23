export class NodeManager {
    nodes = [
        { id: "node-alpha", latencyMs: 4, status: "active" },
        { id: "node-beta", latencyMs: 7, status: "active" }
    ];
    mountLocalCluster() {
        console.log("[NodeManager] Mounted " + this.nodes.length + " cluster mesh nodes.");
    }
    getActiveNodes() {
        return this.nodes.filter(n => n.status === "active");
    }
}
