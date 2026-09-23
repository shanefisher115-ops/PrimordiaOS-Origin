import { Logger } from '../../core/logger';
import { Social } from './social-graph';
import { Content } from './content-graph';
import { Monetization } from './monetization-brain';
import { Analytics } from './analytics-brain';
const registry = {};
export const Platform = {
    registerContent(item) {
        registry[item.id] = item;
        Logger.info('Platform registered content', item);
    },
    broadcastContent(id) {
        const item = registry[id];
        if (!item)
            return;
        Logger.info('Platform broadcasting content', { id });
        item.channels.forEach(channel => {
            Social.pushToChannel(channel, item);
        });
    },
    scheduleLiveSegment(id) {
        const item = registry[id];
        if (!item)
            return;
        Logger.info('Platform scheduling live segment', { id });
        Content.schedule(item);
    },
    recordRevenue(source, amount) {
        Monetization.record(source, amount);
    },
    recordMetric(contentId, channel, metric, value) {
        Analytics.record(contentId, channel, metric, value);
    },
    all() {
        return registry;
    },
};
