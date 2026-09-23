import { Logger } from '../core/logger';
import { AiInference } from './aiInference';
export class AiScenePlanner {
    static async plan(input) {
        Logger.info('AiScenePlanner planning scene', { input });
        const response = await AiInference.run('SCENE_GENERATION', input);
        const shots = response.split('.').map(s => s.trim()).filter(Boolean);
        return {
            id: `scene_${Date.now()}`,
            description: input,
            shots,
        };
    }
}
