export class BehaviorCoordinator {
  constructor(private engine: any) {}

  coordinate() {
    this.engine.agentGoals.pursueGoals();
    this.engine.realmCulture.influenceBehavior();
  }
}
