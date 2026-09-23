import { Logger } from './logger';

interface ProcessRecord {
  id: string;
  name: string;
  startedAt: string;
  status: 'RUNNING' | 'STOPPED' | 'FAILED';
}

const processes: Record<string, ProcessRecord> = {};

export const ProcessManager = {
  start(id: string, name: string) {
    processes[id] = {
      id,
      name,
      startedAt: new Date().toISOString(),
      status: 'RUNNING',
    };
    Logger.info('Process started', { id, name });
  },

  stop(id: string) {
    if (processes[id]) {
      processes[id].status = 'STOPPED';
      Logger.info('Process stopped', { id });
    }
  },

  fail(id: string, reason: string) {
    if (processes[id]) {
      processes[id].status = 'FAILED';
      Logger.error('Process failed', { id, reason });
    }
  },

  list() {
    return Object.values(processes);
  },
};
