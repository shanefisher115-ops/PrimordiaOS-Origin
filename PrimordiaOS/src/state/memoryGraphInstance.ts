export type NodeKind = 
  | "System" 
  | "AutonomyShift" 
  | "AgentEvolution" 
  | "CreatorEvent" 
  | "RevenueEvent" 
  | "ConversionEvent" 
  | "SimulationResult" 
  | "PhysicsEvent" 
  | "TaskCompletion" 
  | "PipelineEvent";

export interface MemoryNode {
  id: string;
  kind: NodeKind;
  payload?: any;
}

export interface MemoryEdge {
  source: string;
  target: string;
  weight?: number;
}

export class MemoryGraph {
  nodes: MemoryNode[] = [];
  edges: MemoryEdge[] = [];
  
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
