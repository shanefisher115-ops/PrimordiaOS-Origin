import { Logger } from '../../core/logger';

interface ScheduledItem {
  id: string;
  type: string;
  title: string;
  scheduledAt: string;
}

const scheduled: ScheduledItem[] = [];

export const Content = {
  schedule(item: any) {
    const entry: ScheduledItem = {
      id: item.id,
      type: item.type,
      title: item.title,
      scheduledAt: new Date().toISOString(),
    };

    scheduled.push(entry);
    Logger.info('ContentGraph scheduled item', entry);
  },

  all() {
    return scheduled;
  },
};
