import { Logger } from '../../core/logger';

const state: Record<string, any> = {};

export const RealmState = {
  set(realm: string, data: any) {
    state[realm] = data;
    Logger.debug('RealmState updated', { realm, data });
  },

  get(realm: string) {
    return state[realm];
  },

  dump() {
    return state;
  }
};
