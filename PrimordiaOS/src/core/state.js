import { Logger } from './logger';
const state = {};
export const State = {
    set(key, value) {
        state[key] = value;
        Logger.debug('State updated', { key, value });
    },
    get(key) {
        return state[key];
    },
    all() {
        return state;
    },
};
