export interface ClusterNode {
  id: string;
  latencyMs: number;
  status: "active" | "standby";
}

export class NodeManager {
  private nodes: ClusterNode[] = [
    { id: "node-alpha", latencyMs: 4, status: "active" },
    { id: "node-beta", latencyMs: 7, status: "active" }
  ];

  mountLocalCluster(): void {
    console.log("[NodeManager] Mounted " + this.nodes.length + " cluster mesh nodes.");
  }

  getActiveNodes(): ClusterNode[] {
    return this.nodes.filter(n => n.status === "active");
  }
}