import { Logger } from './logger';

const memory: Record<string, any> = {};

export const MemoryManager = {
  set(key: string, value: any) {
    memory[key] = value;
    Logger.debug('MemoryManager set', { key });
  },

  get<T = any>(key: string): T | undefined {
    return memory[key];
  },

  delete(key: string) {
    delete memory[key];
    Logger.debug('MemoryManager delete', { key });
  },

  dump() {
    return memory;
  },
};
