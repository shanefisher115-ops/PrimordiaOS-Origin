"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScheduler = startScheduler;
const event_bus_1 = require("./event-bus");
const tasks = [
    { id: "daily-review", cron: "3600000", type: "review" }, // every hour
];
function startScheduler() {
    for (const task of tasks) {
        const interval = Number(task.cron);
        setInterval(() => {
            (0, event_bus_1.emit)({
                id: `${task.id}-${Date.now()}`,
                type: "scheduler",
                source: "scheduler",
                payload: { task },
                timestamp: Date.now(),
            });
        }, interval);
    }
}
