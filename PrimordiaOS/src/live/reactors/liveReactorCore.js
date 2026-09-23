import { Logger } from '../../core/logger';
import { LiveEventBus } from '../core/liveEventBus';
const reactors = [];
export const LiveReactorCore = {
    register(fn) {
        reactors.push(fn);
        Logger.info('LiveReactorCore registered reactor');
    },
    init() {
        LiveEventBus.subscribe(async (event) => {
            for (const reactor of reactors) {
                await reactor(event);
            }
        });
    }
};
