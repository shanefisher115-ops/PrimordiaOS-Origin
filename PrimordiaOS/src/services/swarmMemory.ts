import { Logger } from '../core/logger';

const memory: Record<string, any> = {};

export const SwarmMemory = {
  set(key: string, value: any) {
    memory[key] = value;
    Logger.info('SwarmMemory set', { key });
  },

  get(key: string) {
    return memory[key];
  },

  dump() {
    return memory;
  },
};
