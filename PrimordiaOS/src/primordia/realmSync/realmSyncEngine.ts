import { Logger } from '../../core/logger';
import { RealmState } from './realmState';

export const RealmSyncEngine = {
  async sync(realm: string, data: any) {
    Logger.info('RealmSyncEngine syncing realm', { realm });
    RealmState.set(realm, data);
    return RealmState.get(realm);
  }
};
