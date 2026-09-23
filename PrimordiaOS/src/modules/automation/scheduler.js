import { Logger } from '../../core/logger';
const tasks = [];
export const Scheduler = {
    register(name, intervalMs, fn) {
        const task = {
            id: `task_${Date.now()}`,
            name,
            intervalMs,
            fn,
        };
        tasks.push(task);
        Logger.info('Scheduler registered task', { name, intervalMs });
        setInterval(async () => {
            Logger.debug('Scheduler running task', { name });
            await fn();
        }, intervalMs);
    },
    start() {
        Logger.info('Scheduler start called (tasks auto-run via setInterval)');
    },
    list() {
        return tasks;
    },
};
