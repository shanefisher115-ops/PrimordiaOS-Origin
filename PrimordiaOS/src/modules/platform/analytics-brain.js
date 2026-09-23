import { Logger } from '../../core/logger';
const metrics = [];
export const Analytics = {
    record(contentId, channel, metric, value) {
        const entry = {
            id: `metric_${Date.now()}`,
            contentId,
            channel,
            metric,
            value,
            timestamp: new Date().toISOString(),
        };
        metrics.push(entry);
        Logger.info('AnalyticsBrain recorded metric', entry);
    },
    all() {
        return metrics;
    },
};
