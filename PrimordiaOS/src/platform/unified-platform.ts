import { Logger } from '../../core/logger';
import { Social } from './social-graph';
import { Content } from './content-graph';
import { Monetization } from './monetization-brain';
import { Analytics } from './analytics-brain';

interface ContentItem {
  id: string;
  type: string;
  title: string;
  channels: string[];
}

const registry: Record<string, ContentItem> = {};

export const Platform = {
  registerContent(item: ContentItem) {
    registry[item.id] = item;
    Logger.info('Platform registered content', item);
  },

  broadcastContent(id: string) {
    const item = registry[id];
    if (!item) return;

    Logger.info('Platform broadcasting content', { id });

    item.channels.forEach(channel => {
      Social.pushToChannel(channel, item);
    });
  },

  scheduleLiveSegment(id: string) {
    const item = registry[id];
    if (!item) return;

    Logger.info('Platform scheduling live segment', { id });
    Content.schedule(item);
  },

  recordRevenue(source: string, amount: number) {
    Monetization.record(source, amount);
  },

  recordMetric(contentId: string, channel: string, metric: string, value: number) {
    Analytics.record(contentId, channel, metric, value);
  },

  all() {
    return registry;
  },
};
