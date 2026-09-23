import { Logger } from '../../core/logger';

const realms = ['vision', 'unreal', 'creator', 'loops', 'platform'];

export const RealmCoordinator = {
  async syncRealms() {
    Logger.info('RealmCoordinator syncing realms', { realms });
  },

  list() {
    return realms;
  }
};
