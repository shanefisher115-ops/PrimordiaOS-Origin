import { Logger } from '../../core/logger';
export const RealmSyncMonitor = {
    monitor(realm) {
        Logger.info('RealmSyncMonitor', { realm, at: new Date().toISOString() });
        return { realm, status: 'OK' };
    }
};
