import { Logger } from './logger';
const tasks = [];
export const Scheduler = {
    register(name, intervalMs, fn) {
        tasks.push({ name, intervalMs, fn });
        Logger.info('Scheduler registered task', { name, intervalMs });
        setInterval(async () => {
            Logger.debug('Scheduler running task', { name });
            await fn();
        }, intervalMs);
    },
    list() {
        return tasks;
    },
};
