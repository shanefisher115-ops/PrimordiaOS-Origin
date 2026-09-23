import { Logger } from '../../core/logger';

export const RealmPulse = {
  pulse(realm: string) {
    Logger.info('RealmPulse', { realm, at: new Date().toISOString() });
  }
};
