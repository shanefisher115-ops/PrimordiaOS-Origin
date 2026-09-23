import { Logger } from '../../core/logger';
const state = {};
export const RealmState = {
    set(realm, data) {
        state[realm] = data;
        Logger.debug('RealmState updated', { realm, data });
    },
    get(realm) {
        return state[realm];
    },
    dump() {
        return state;
    }
};
