export class AgentGoals {
    engine;
    constructor(engine) {
        this.engine = engine;
    }
    assignInitialGoals() {
        this.engine.state.agents.forEach((agent) => {
            agent.goals = ["expand_realm", "gather_resources", "seek_signals"];
        });
    }
    pursueGoals() {
        const agents = this.engine.state.agents;
        if (!agents.length)
            return;
        agents.forEach((agent) => {
            const goals = agent.goals || [];
            goals.forEach(goal => this.applyGoal(agent, goal));
        });
    }
    applyGoal(agent, goal) {
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
