import { Logger } from '../../core/logger';

export const RealmHeartbeat = {
  pulse(realm: string) {
    Logger.info('RealmHeartbeat pulse', { realm, at: new Date().toISOString() });
  }
};
