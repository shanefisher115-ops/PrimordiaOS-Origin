export type ScheduleId = string;

export interface ScheduledTask {
  id: ScheduleId;
  interval: number;
  action: () => Promise<void>;
}

export class Scheduler {
  private tasks: Map<ScheduleId, NodeJS.Timeout> = new Map();

  register(task: ScheduledTask): void {
    if (this.tasks.has(task.id)) {
      throw new Error("Scheduled task already exists: " + task.id);
    }

    const timer = setInterval(async () => {
      try {
        await task.action();
      } catch (err) {
        console.error("[Scheduler] Task failed:", err);
      }
    }, task.interval);

    this.tasks.set(task.id, timer);
  }

  stop(id: ScheduleId): void {
    const timer = this.tasks.get(id);
    if (!timer) {
      throw new Error("Scheduled task not found: " + id);
    }
    clearInterval(timer);
    this.tasks.delete(id);
  }

  stopAll(): void {
    for (const timer of this.tasks.values()) {
      clearInterval(timer);
    }
    this.tasks.clear();
  }
}

export const scheduler = new Scheduler();
