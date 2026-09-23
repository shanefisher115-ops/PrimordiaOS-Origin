// Autonomous Goal-Formation Engine (AGFE)
// Forms, evaluates, and prioritizes goals.

export interface Goal {
  id: string;
  description: string;
  realm: string;
  priority: number;
  createdAt: Date;
}

export class AutonomousGoalFormationEngine {
  private goals: Goal[] = [];

  createGoal(realm: string, description: string, priority: number = 0.5): Goal {
    const goal: Goal = {
      id: `goal-${Date.now()}`,
      description,
      realm,
      priority,
      createdAt: new Date(),
    };
    this.goals.push(goal);
    return goal;
  }

  listGoals(): Goal[] {
    return [...this.goals].sort((a, b) => b.priority - a.priority);
  }

  promoteGoal(id: string, delta: number = 0.1) {
    const goal = this.goals.find((g) => g.id === id);
    if (!goal) return;
    goal.priority = Math.min(1, goal.priority + delta);
  }
}
