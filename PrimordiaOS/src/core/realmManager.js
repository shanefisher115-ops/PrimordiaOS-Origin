import { Logger } from './logger';
const realms = {};
export const RealmManager = {
    register(id, name, type) {
        realms[id] = { id, name, type, status: 'ONLINE' };
        Logger.info('Realm registered', { id, name, type });
    },
    setStatus(id, status) {
        if (realms[id]) {
            realms[id].status = status;
            Logger.info('Realm status updated', { id, status });
        }
    },
    list() {
        return Object.values(realms);
    },
};
