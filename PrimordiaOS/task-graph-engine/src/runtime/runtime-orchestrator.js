export const createRuntimeOrchestrator = (context) => ({
    context,
    async start() {
        const { graph, runtime, scheduler } = this.context;
        // Enqueue all tasks initially (later you’ll respect dependencies)
        graph.tasks.forEach(task => scheduler.enqueue(task));
        const results = [];
        let scheduled;
        while ((scheduled = scheduler.dequeue())) {
            const execResult = await runtime.runTask(scheduled.task);
            results.push(execResult);
        }
        return results;
    },
});
