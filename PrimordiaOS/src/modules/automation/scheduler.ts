import { Logger } from '../../core/logger';

type TaskFn = () => Promise<void> | void;

interface ScheduledTask {
  id: string;
  name: string;
  intervalMs: number;
  fn: TaskFn;
}

const tasks: ScheduledTask[] = [];

export const Scheduler = {
  register(name: string, intervalMs: number, fn: TaskFn) {
    const task: ScheduledTask = {
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
