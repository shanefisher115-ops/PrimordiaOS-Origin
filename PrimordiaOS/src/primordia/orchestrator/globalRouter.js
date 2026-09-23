import { Logger } from '../../core/logger';
export const GlobalRouter = {
    route(event) {
        Logger.info('GlobalRouter routing event', event);
    }
};
