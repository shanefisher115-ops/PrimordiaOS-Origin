// src/core/intelligenceCoordinator.ts

import { CoreState } from "./autonomy/DecisionEngine";
import { DecisionEngine, Decision } from "./autonomy/DecisionEngine";
import { GoalEngine, Goal } from "./autonomy/GoalEngine";
import { FeedbackEngine, Feedback } from "./autonomy/FeedbackEngine";

export interface IntelligenceSummary {
  decisions: Decision[];
  goals: Goal[];
  feedback: Feedback;
}

export class IntelligenceCoordinator {
  private decisionEngine: DecisionEngine;
  private goalEngine: GoalEngine;
  private feedbackEngine: FeedbackEngine;

  constructor() {
    this.decisionEngine = new DecisionEngine();
    this.goalEngine = new GoalEngine();
    this.feedbackEngine = new FeedbackEngine();
  }

  async runCycle(state: CoreState): Promise<IntelligenceSummary> {
    const decisions = this.decisionEngine.evaluate(state);
    const goals = this.goalEngine.assignGoals({ id: "system" });
    const feedback = this.feedbackEngine.adapt(state);

    return {
      decisions,
      goals,
      feedback
    };
  }
}
