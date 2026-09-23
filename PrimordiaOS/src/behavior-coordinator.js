export class BehaviorCoordinator {
    engine;
    constructor(engine) {
        this.engine = engine;
    }
    coordinate() {
        this.engine.agentGoals.pursueGoals();
        this.engine.realmCulture.influenceBehavior();
    }
}
