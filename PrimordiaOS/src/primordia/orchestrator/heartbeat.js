import { Logger } from '../../core/logger';
export const Heartbeat = {
    start() {
        setInterval(() => {
            Logger.debug('PrimordiaOS heartbeat');
        }, 5000);
    }
};
