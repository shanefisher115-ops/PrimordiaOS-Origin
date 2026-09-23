import { Logger } from '../core/logger';
import { AiScenePlanner } from '../vision/aiScenePlanner';
export class SimulationPlanner {
    async planFromPrompt(prompt) {
        Logger.info('SimulationPlanner planning from prompt', { prompt });
        const scenePlan = await AiScenePlanner.plan(prompt);
        return {
            planId: scenePlan.id,
            description: scenePlan.description,
            shots: scenePlan.shots,
        };
    }
}
export const simulationPlanner = new SimulationPlanner();
