import { Logger } from './logger';
const processes = {};
export const ProcessManager = {
    start(id, name) {
        processes[id] = {
            id,
            name,
            startedAt: new Date().toISOString(),
            status: 'RUNNING',
        };
        Logger.info('Process started', { id, name });
    },
    stop(id) {
        if (processes[id]) {
            processes[id].status = 'STOPPED';
            Logger.info('Process stopped', { id });
        }
    },
    fail(id, reason) {
        if (processes[id]) {
            processes[id].status = 'FAILED';
            Logger.error('Process failed', { id, reason });
        }
    },
    list() {
        return Object.values(processes);
    },
};
