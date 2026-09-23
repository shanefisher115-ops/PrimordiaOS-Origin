import { Agent } from "./meta.js";

export class AgentGoals {
  constructor(private engine: any) {}

  assignInitialGoals() {
    this.engine.state.agents.forEach((agent: Agent) => {
      (agent as any).goals = ["expand_realm", "gather_resources", "seek_signals"];
    });
  }

  pursueGoals() {
    const agents = this.engine.state.agents;
    if (!agents.length) return;

    agents.forEach((agent: any) => {
      const goals: string[] = agent.goals || [];
      goals.forEach(goal => this.applyGoal(agent, goal));
    });
  }

  private applyGoal(agent: any, goal: string) {
    switch (goal) {
      case "expand_realm":
        this.engine.realmExpansion.expand();
        break;
      case "gather_resources":
        this.engine.economy.generateRandomResource();
        break;
      case "seek_signals":
        this.engine.signals.emitRandomSignal();
        break;
    }
  }
}
