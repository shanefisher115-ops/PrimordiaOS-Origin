import { Logger } from '../../core/logger';

const registry: Record<string, (data: any) => Promise<any>> = {};

export const RealmSyncRegistry = {
  register(realm: string, fn: (data: any) => Promise<any>) {
    registry[realm] = fn;
    Logger.info('RealmSyncRegistry registered realm sync handler', { realm });
  },

  get(realm: string) {
    return registry[realm];
  },

  all() {
    return registry;
  }
};
