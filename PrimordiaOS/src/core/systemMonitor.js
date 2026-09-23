import os from 'os';
import { Logger } from './logger';
export const SystemMonitor = {
    snapshot() {
        const snapshot = {
            loadAvg: os.loadavg(),
            freeMem: os.freemem(),
            totalMem: os.totalmem(),
            uptime: os.uptime(),
        };
        Logger.debug('SystemMonitor snapshot', snapshot);
        return snapshot;
    },
};
