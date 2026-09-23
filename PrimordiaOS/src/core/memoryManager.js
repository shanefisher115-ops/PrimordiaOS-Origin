import { Logger } from './logger';
const memory = {};
export const MemoryManager = {
    set(key, value) {
        memory[key] = value;
        Logger.debug('MemoryManager set', { key });
    },
    get(key) {
        return memory[key];
    },
    delete(key) {
        delete memory[key];
        Logger.debug('MemoryManager delete', { key });
    },
    dump() {
        return memory;
    },
};
