import { Logger } from '../../core/logger';
const memory = {};
export const DistributedMemory = {
    set(key, value) {
        memory[key] = value;
        Logger.debug('DistributedMemory set', { key, value });
    },
    get(key) {
        return memory[key];
    },
    dump() {
        return memory;
    }
};
