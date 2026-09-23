import { Logger } from '../../core/logger';
const registry = {};
export const RealmSyncRegistry = {
    register(realm, fn) {
        registry[realm] = fn;
        Logger.info('RealmSyncRegistry registered realm sync handler', { realm });
    },
    get(realm) {
        return registry[realm];
    },
    all() {
        return registry;
    }
};
