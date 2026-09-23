import { Logger } from '../core/logger';

const state: Record<string, any> = {
  currentScene: null,
  lastEvent: null,
  variables: {},
};

export const SimulationState = {
  set(key: string, value: any) {
    state[key] = value;
    Logger.debug('SimulationState set', { key, value });
  },

  get<T = any>(key: string): T | null {
    return state[key] ?? null;
  },

  setVar(name: string, value: any) {
    state.variables[name] = value;
    Logger.debug('SimulationState variable set', { name, value });
  },

  getVar<T = any>(name: string): T | null {
    return state.variables[name] ?? null;
  },

  dump() {
    return state;
  },
};
