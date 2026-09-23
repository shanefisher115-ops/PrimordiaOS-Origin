// src/core/intelligenceCoordinator.ts
import { DecisionEngine } from "./autonomy/DecisionEngine";
import { GoalEngine } from "./autonomy/GoalEngine";
import { FeedbackEngine } from "./autonomy/FeedbackEngine";
export class IntelligenceCoordinator {
    decisionEngine;
    goalEngine;
    feedbackEngine;
    constructor() {
        this.decisionEngine = new DecisionEngine();
        this.goalEngine = new GoalEngine();
        this.feedbackEngine = new FeedbackEngine();
    }
    async runCycle(state) {
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
