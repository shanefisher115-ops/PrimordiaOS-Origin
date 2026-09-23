import { Logger } from './logger';

const state: Record<string, any> = {};

export const State = {
  set(key: string, value: any) {
    state[key] = value;
    Logger.debug('State updated', { key, value });
  },

  get<T = any>(key: string): T | undefined {
    return state[key];
  },

  all() {
    return state;
  },
};
