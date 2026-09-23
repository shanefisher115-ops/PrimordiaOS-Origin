import { Logger } from '../core/logger';
import { vertexAiBridge } from '../integrations/vertexAiBridge';
export class AiInference {
    static async run(task, input) {
        Logger.info('AiInference running', { task, input });
        const prompt = `[TASK:${task}] ${input}`;
        return await vertexAiBridge.runModel(prompt);
    }
}
