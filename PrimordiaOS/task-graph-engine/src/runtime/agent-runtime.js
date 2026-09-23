export const createAgentRuntime = (context) => ({
    context,
    async runTask(task) {
        const agent = this.context.agentRegistry.findForTask(task.name);
        if (!agent) {
            return {
                taskId: task.id,
                agentId: "none",
                status: "failed",
                errorMessage: `No agent found for task: ${task.name}`,
                completedAt: new Date().toISOString(),
            };
        }
        const sandboxContext = {
            agent,
            task,
            config: {
                timeoutMs: this.context.config.defaultTimeoutMs,
                allowNetwork: true,
                allowFilesystem: false,
            },
        };
        return this.context.sandbox.run(sandboxContext);
    },
    async runTasks(tasks) {
        const results = [];
        for (const task of tasks) {
            const result = await this.runTask(task);
            results.push(result);
        }
        return results;
    },
});
