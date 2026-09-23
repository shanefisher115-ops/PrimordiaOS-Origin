import { emit } from "./event-bus";

type ScheduledTask = {
  id: string;
  cron: string;          // later: real cron; for now: ms interval
  type: string;          // "review", "sync", "heartbeat"
};

const tasks: ScheduledTask[] = [
  { id: "daily-review", cron: "3600000", type: "review" }, // every hour
];

export function startScheduler() {
  for (const task of tasks) {
    const interval = Number(task.cron);
    setInterval(() => {
      emit({
        id: `${task.id}-${Date.now()}`,
        type: "scheduler",
        source: "scheduler",
        payload: { task },
        timestamp: Date.now(),
      });
    }, interval);
  }
}
