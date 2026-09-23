import { Logger } from '../../core/logger';

const memory: Record<string, any> = {};

export const DistributedMemory = {
  set(key: string, value: any) {
    memory[key] = value;
    Logger.debug('DistributedMemory set', { key, value });
  },

  get(key: string) {
    return memory[key];
  },

  dump() {
    return memory;
  }
};
