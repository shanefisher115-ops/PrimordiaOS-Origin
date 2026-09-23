// Autonomous Goal-Formation Engine (AGFE)
// Forms, evaluates, and prioritizes goals.
export class AutonomousGoalFormationEngine {
    goals = [];
    createGoal(realm, description, priority = 0.5) {
        const goal = {
            id: `goal-${Date.now()}`,
            description,
            realm,
            priority,
            createdAt: new Date(),
        };
        this.goals.push(goal);
        return goal;
    }
    listGoals() {
        return [...this.goals].sort((a, b) => b.priority - a.priority);
    }
    promoteGoal(id, delta = 0.1) {
        const goal = this.goals.find((g) => g.id === id);
        if (!goal)
            return;
        goal.priority = Math.min(1, goal.priority + delta);
    }
}
