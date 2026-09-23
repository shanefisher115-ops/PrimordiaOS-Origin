export type MetricType =
  | "views"
  | "clicks"
  | "conversions"
  | "earnings";

export type MetricKey = {
  contentId: string;
  channelId: string;
};

export type MetricEvent = {
  key: MetricKey;
  type: MetricType;
  value: number;
  timestamp: number;
};

export class AnalyticsBrain {
  private metrics: MetricEvent[] = [];

  record(event: MetricEvent) {
    this.metrics.push(event);
  }

  forContent(contentId: string) {
    return this.metrics.filter(m => m.key.contentId === contentId);
  }

  forChannel(channelId: string) {
    return this.metrics.filter(m => m.key.channelId === channelId);
  }
}

export const Analytics = new AnalyticsBrain();
