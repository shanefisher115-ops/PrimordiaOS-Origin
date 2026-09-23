import { Logger } from '../core/logger';
import { AiInference } from './aiInference';

export interface ScenePlan {
  id: string;
  description: string;
  shots: string[];
}

export class AiScenePlanner {
  static async plan(input: string): Promise<ScenePlan> {
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
