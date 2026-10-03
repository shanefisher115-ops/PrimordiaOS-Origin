export type AgentId = string;

export interface AgentContext {
  realm: string;
  memory: (key: string) => Promise<unknown>;
  emit: (topic: string, payload: unknown) => Promise<void>;
}

export interface Agent {
  id: AgentId;
  role: string;
  run(task: AgentTask, ctx: AgentContext): Promise<AgentResult>;
}

export interface AgentTask {
  id: string;
  type: string;
  payload: unknown;
}

export interface AgentResult {
  success: boolean;
  output?: unknown;
  error?: string;
}

export class AgentSwarm {
  private agents = new Map<AgentId, Agent>();

  register(agent: Agent) {
    if (this.agents.has(agent.id)) {
      throw new Error("Agent already registered: " + agent.id);
    }
    this.agents.set(agent.id, agent);
  }

  async dispatch(task: AgentTask, ctx: AgentContext): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    for (const agent of this.agents.values()) {
      if (agent.role === task.type || agent.role === "general") {
        results.push(await agent.run(task, ctx));
      }
    }
    return results;
  }
}

export const swarm = new AgentSwarm();
