export const runAIAnalysis = async (context) => {
    const { agent, task, config } = context;
    const input = task.metadata?.["input"] ?? "No input provided.";
    const output = {
        model: config.model,
        analysis: `AI analysis of: ${input}`,
    };
    return {
        taskId: task.id,
        agentId: agent.id,
        status: "success",
        output,
        completedAt: new Date().toISOString(),
    };
};
