import { Logger } from '../../core/logger';
import { LiveEventBus } from './liveEventBus';

export const LiveIngestion = {
  async ingest(source: string, data: any) {
    Logger.info('LiveIngestion ingest', { source, data });
    await LiveEventBus.emit('live_ingest', { source, data });
  }
};
