export const createTaskScheduler = (config) => {
    const queue = [];
    const failures = {};
    return {
        config,
        enqueue(task) {
            const scheduled = {
                id: `sched-${task.id}`,
                task,
                status: "queued",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            queue.push(scheduled);
            return scheduled;
        },
        markRunning(id) {
            const item = queue.find(q => q.id === id);
            if (item) {
                item.status = "running";
                item.updatedAt = new Date().toISOString();
            }
        },
        markCompleted(id) {
            const item = queue.find(q => q.id === id);
            if (item) {
                item.status = "completed";
                item.updatedAt = new Date().toISOString();
            }
        },
        markFailed(id, reason) {
            const item = queue.find(q => q.id === id);
            if (item) {
                item.status = "failed";
                item.updatedAt = new Date().toISOString();
                failures[id] = reason;
            }
        },
        dequeueReady() {
            const idx = queue.findIndex(q => q.status === "queued");
            if (idx === -1)
                return undefined;
            const item = queue[idx];
            queue.splice(idx, 1);
            return item;
        },
        list() {
            return [...queue];
        },
    };
};
