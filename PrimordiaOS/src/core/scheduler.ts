import { Logger } from './logger';

type TaskFn = () => Promise<void> | void;

interface ScheduledTask {
  name: string;
  intervalMs: number;
  fn: TaskFn;
}

const tasks: ScheduledTask[] = [];

export const Scheduler = {
  register(name: string, intervalMs: number, fn: TaskFn) {
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
