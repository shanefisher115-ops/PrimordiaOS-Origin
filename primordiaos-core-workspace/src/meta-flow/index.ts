import { primordiaFlow } from "../primordiaflow";

export interface MetaFlowMutation {
  id: string;
  targetFlow: string;
  mutation: string;
  timestamp: number;
}

export class MetaFlow {
  private mutations: MetaFlowMutation[] = [];

  record(m: MetaFlowMutation): void {
    this.mutations.push(m);
    console.log("[MetaFlow] Mutation:", m.mutation, "Flow:", m.targetFlow);
  }

  async mutateFlow(flowId: string): Promise<void> {
    const mutation: MetaFlowMutation = {
      id: "mutation-" + Date.now(),
      targetFlow: flowId,
      mutation: "append-random-node",
      timestamp: Date.now()
    };

    this.record(mutation);

    const flow = primordiaFlow.get(flowId);
    if (!flow) {
      console.log("[MetaFlow] Flow not found:", flowId);
      return;
    }

    flow.nodes.push({
      id: "auto-node-" + Date.now(),
      type: "auto-generated",
      config: { entropy: Math.random() }
    });

    console.log("[MetaFlow] Flow mutated:", flowId);
  }

  async pulse(): Promise<void> {
    await this.mutateFlow("primordiaos.autonomous.build");
  }

  getMutations(): MetaFlowMutation[] {
    return this.mutations;
  }
}

export const metaFlow = new MetaFlow();
