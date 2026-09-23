import { Logger } from '../../core/logger';

interface MetricRecord {
  id: string;
  contentId: string;
  channel: string;
  metric: string;
  value: number;
  timestamp: string;
}

const metrics: MetricRecord[] = [];

export const Analytics = {
  record(contentId: string, channel: string, metric: string, value: number) {
    const entry: MetricRecord = {
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
