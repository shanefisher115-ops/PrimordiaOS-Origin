export const createShellBridge = () => ({
    async runGraph(graph, orchestrator) {
        const results = await orchestrator.start();
        return {
            success: true,
            message: `Executed graph '${graph.id}' with ${results.length} tasks.`,
            data: results,
        };
    },
});
