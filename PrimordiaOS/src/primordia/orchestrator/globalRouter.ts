import { Logger } from '../../core/logger';

export const GlobalRouter = {
  route(event: any) {
    Logger.info('GlobalRouter routing event', event);
  }
};
