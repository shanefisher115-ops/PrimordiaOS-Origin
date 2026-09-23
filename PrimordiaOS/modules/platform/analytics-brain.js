export class AnalyticsBrain {
    metrics = [];
    record(event) {
        this.metrics.push(event);
    }
    forContent(contentId) {
        return this.metrics.filter(m => m.key.contentId === contentId);
    }
    forChannel(channelId) {
        return this.metrics.filter(m => m.key.channelId === channelId);
    }
}
export const Analytics = new AnalyticsBrain();
