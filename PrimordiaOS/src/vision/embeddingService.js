import { Logger } from '../core/logger';
import { vertexAiBridge } from '../integrations/vertexAiBridge';
export class EmbeddingService {
    static async embed(text) {
        Logger.info('EmbeddingService embedding text', { text });
        // Placeholder: call real Vertex AI embedding model
        const response = await vertexAiBridge.runModel(`EMBED: ${text}`);
        // Fake embedding from string length
        return Array.from({ length: 16 }, (_, i) => (text.length + i) / 100);
    }
}
