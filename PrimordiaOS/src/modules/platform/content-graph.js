import { Logger } from '../../core/logger';
const scheduled = [];
export const Content = {
    schedule(item) {
        const entry = {
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
