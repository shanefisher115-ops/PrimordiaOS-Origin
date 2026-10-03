export interface FlowNode {
  id: string;
  type: string;
  config: unknown;
}

export interface FlowEdge {
  from: string;
  to: string;
}

export interface FlowGraph {
  id: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export class PrimordiaFlow {
  private graphs: Map<string, FlowGraph> = new Map();

  register(graph: FlowGraph): void {
    if (this.graphs.has(graph.id)) {
      throw new Error("Flow graph exists: " + graph.id);
    }
    this.graphs.set(graph.id, graph);
  }

  get(id: string): FlowGraph | undefined {
    return this.graphs.get(id);
  }

  async execute(id: string, context: unknown): Promise<void> {
    const graph = this.graphs.get(id);
    if (!graph) {
      throw new Error("Flow graph not found: " + id);
    }
    console.log("[PrimordiaFlow] Executing graph " + id);
    console.log("[PrimordiaFlow] Context:", context);
    // Placeholder: walk nodes and edges
  }

  // REQUIRED BY OMNISCIENCE
  listIds(): string[] {
    return Array.from(this.graphs.keys());
  }

  // Optional but useful for debugging
  listGraphs(): FlowGraph[] {
    return Array.from(this.graphs.values());
  }
}

export const primordiaFlow = new PrimordiaFlow();
