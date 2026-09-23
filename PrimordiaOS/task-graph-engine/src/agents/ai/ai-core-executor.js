export const runAICoreAction = async (context) => {
    const { agent, task, config } = context;
    const prompt = task.metadata?.["prompt"] ?? "No prompt provided.";
    const output = {
        model: config.model,
        response: `AI core response to: ${prompt}`,
    };
    return {
        taskId: task.id,
        agentId: agent.id,
        status: "success",
        output,
        completedAt: new Date().toISOString(),
    };
};
