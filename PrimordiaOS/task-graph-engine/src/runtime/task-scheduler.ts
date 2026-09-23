import { Task } from "../graph/task";

export type ScheduledTaskStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export interface ScheduledTask {
  id: string;
  task: Task;
  status: ScheduledTaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TaskSchedulerConfig {
  maxConcurrentTasks: number;
}

export interface TaskScheduler {
  config: TaskSchedulerConfig;
  enqueue(task: Task): ScheduledTask;
  markRunning(id: string): void;
  markCompleted(id: string): void;
  markFailed(id: string, reason?: string): void;
  dequeueReady(): ScheduledTask | undefined;
  list(): ScheduledTask[];
}

export const createTaskScheduler = (
  config: TaskSchedulerConfig,
): TaskScheduler => {
  const queue: ScheduledTask[] = [];
  const failures: Record<string, string | undefined> = {};

  return {
    config,

    enqueue(task: Task): ScheduledTask {
      const scheduled: ScheduledTask = {
        id: `sched-${task.id}`,
        task,
        status: "queued",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      queue.push(scheduled);
      return scheduled;
    },

    markRunning(id: string): void {
      const item = queue.find(q => q.id === id);
      if (item) {
        item.status = "running";
        item.updatedAt = new Date().toISOString();
      }
    },

    markCompleted(id: string): void {
      const item = queue.find(q => q.id === id);
      if (item) {
        item.status = "completed";
        item.updatedAt = new Date().toISOString();
      }
    },

    markFailed(id: string, reason?: string): void {
      const item = queue.find(q => q.id === id);
      if (item) {
        item.status = "failed";
        item.updatedAt = new Date().toISOString();
        failures[id] = reason;
      }
    },

    dequeueReady(): ScheduledTask | undefined {
      const idx = queue.findIndex(q => q.status === "queued");
      if (idx === -1) return undefined;
      const item = queue[idx];
      queue.splice(idx, 1);
      return item;
    },

    list(): ScheduledTask[] {
      return [...queue];
    },
  };
};
