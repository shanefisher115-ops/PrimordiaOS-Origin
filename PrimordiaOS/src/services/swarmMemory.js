import { Logger } from '../core/logger';
const memory = {};
export const SwarmMemory = {
    set(key, value) {
        memory[key] = value;
        Logger.info('SwarmMemory set', { key });
    },
    get(key) {
        return memory[key];
    },
    dump() {
        return memory;
    },
};
