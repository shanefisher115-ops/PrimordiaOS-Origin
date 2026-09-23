import { Logger } from '../core/logger';
let depth = 0;
export const LoopDepth = {
    increment() {
        depth++;
        Logger.debug('LoopDepth incremented', { depth });
        return depth;
    },
    reset() {
        depth = 0;
        Logger.debug('LoopDepth reset');
    },
    get() {
        return depth;
    },
};
