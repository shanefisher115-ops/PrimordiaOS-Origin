import { Logger } from '../core/logger';
const store = [];
export class SemanticMemory {
    static async store(type, content, embedding) {
        const record = {
            id: `mem_${Date.now()}`,
            type,
            content,
            embedding,
            createdAt: new Date().toISOString(),
        };
        store.push(record);
        Logger.info('SemanticMemory stored record', { id: record.id, type });
    }
    static searchByType(type) {
        return store.filter(r => r.type === type);
    }
    static all() {
        return store;
    }
}
