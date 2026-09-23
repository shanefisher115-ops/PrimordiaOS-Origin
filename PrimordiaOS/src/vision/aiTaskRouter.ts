import { Logger } from '../core/logger';

export class AiTaskRouter {
  static async route(input: string): Promise<string> {
    Logger.info('AiTaskRouter routing input', { input });

    if (input.includes('offer') || input.includes('EPC')) {
      return 'AFFILIATE_ANALYSIS';
    }
    if (input.includes('scene') || input.includes('unreal')) {
      return 'SCENE_GENERATION';
    }
    if (input.includes('script') || input.includes('hook')) {
      return 'CONTENT_SCRIPTING';
    }
    return 'GENERAL_REASONING';
  }
}
