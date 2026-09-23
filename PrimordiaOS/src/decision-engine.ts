export class DecisionEngine {
  constructor(private engine: any) {}

  tick() {
    const s = this.engine.state;

    const agentCount = s.agents.length;
    const realmCount = s.realms.length;
    const resourceCount = s.resources.length;
    const signalCount = s.signals.length;

    const actions: string[] = [];

    if (realmCount < 10) {
      actions.push("expandRealm");
    }

    if (agentCount < 100) {
      actions.push("spawnSwarm");
    }

    if (resourceCount < 50) {
      actions.push("generateResource");
    }

    if (signalCount < 50) {
      actions.push("emitSignal");
    }

    if (s.workflows.length > 0) {
      actions.push("evolveWorkflow");
    }

    if (agentCount > 0) {
      actions.push("mutateAgent");
    }

    actions.forEach(a => this.runAction(a));
  }

  private runAction(action: string) {
    switch (action) {
      case "expandRealm":
        this.engine.realmExpansion.expand();
        break;
      case "spawnSwarm":
        this.engine.swarm.spawnSwarmWave();
        break;
      case "generateResource":
        this.engine.economy.generateRandomResource();
        break;
      case "emitSignal":
        this.engine.signals.emitRandomSignal();
        break;
      case "evolveWorkflow":
        this.engine.wfEvo.evolveRandomWorkflow();
        break;
      case "mutateAgent":
        this.engine.mutation.mutateRandomAgent();
        break;
    }
  }
}
