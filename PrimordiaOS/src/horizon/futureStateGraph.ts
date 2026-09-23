// horizon/futureStateGraph.ts

import { ProjectedState } from "./types";

export interface FutureStateNode {
  id: string;
  state: ProjectedState;
  neighbors: string[];
}

export class FutureStateGraph {
  private nodes: Map<string, FutureStateNode> = new Map();

  addProjectedState(state: ProjectedState): void {
    const nodeId = state.id;
    if (!this.nodes.has(nodeId)) {
      this.nodes.set(nodeId, {
        id: nodeId,
        state,
        neighbors: [],
      });
    } else {
      const existing = this.nodes.get(nodeId)!;
      existing.state = state;
    }
  }

  linkStates(fromId: string, toId: string): void {
    const from = this.nodes.get(fromId);
    const to = this.nodes.get(toId);
    if (!from || !to) return;

    if (!from.neighbors.includes(toId)) {
      from.neighbors.push(toId);
    }
  }

  getNode(id: string): FutureStateNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): FutureStateNode[] {
    return Array.from(this.nodes.values());
  }

  findMostPromisingState(): FutureStateNode | null {
    const nodes = this.getAllNodes();
    if (nodes.length === 0) return null;

    let best: FutureStateNode | null = null;
    for (const node of nodes) {
      if (
        !best ||
        node.state.projectedGlobalHealthScore >
          best.state.projectedGlobalHealthScore
      ) {
        best = node;
      }
    }
    return best;
  }
}
