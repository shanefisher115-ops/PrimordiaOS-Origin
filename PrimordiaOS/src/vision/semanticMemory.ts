import { Logger } from '../core/logger';

interface MemoryRecord {
  id: string;
  type: 'text' | 'scene' | 'agent';
  content: string;
  embedding: number[];
  createdAt: string;
}

const store: MemoryRecord[] = [];

export class SemanticMemory {
  static async store(
    type: MemoryRecord['type'],
    content: string,
    embedding: number[],
  ) {
    const record: MemoryRecord = {
      id: `mem_${Date.now()}`,
      type,
      content,
      embedding,
      createdAt: new Date().toISOString(),
    };
    store.push(record);
    Logger.info('SemanticMemory stored record', { id: record.id, type });
  }

  static searchByType(type: MemoryRecord['type']) {
    return store.filter(r => r.type === type);
  }

  static all() {
    return store;
  }
}
