import { moneyPlugPipeline } from "../pipelines/moneyplug-pipeline.js";

/**
 * Autonomous Loop Manager for Economy Domain.
 */
export class AutonomousLoopManager {
  constructor() {
    this.pipeline = moneyPlugPipeline;
  }

  async triggerManualCycle() {
    return await this.pipeline.runAutonomousCycle();
  }
}

export const autonomousLoopManager = new AutonomousLoopManager();
