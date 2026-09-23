import { Logger } from '../core/logger';
import { EmbeddingService } from './embeddingService';
import { SemanticMemory } from './semanticMemory';
import { AiTaskRouter } from './aiTaskRouter';
export class VisionCore {
    async processText(input) {
        Logger.info('VisionCore processing text', { input });
        const embedding = await EmbeddingService.embed(input);
        await SemanticMemory.store('text', input, embedding);
        const task = await AiTaskRouter.route(input);
        return { embedding, task };
    }
}
export const visionCore = new VisionCore();
