export const runAIPromptAction = async (context) => {
    const { agent, task, config } = context;
    const topic = task.metadata?.["topic"] ?? "general";
    const output = {
        model: config.model,
        prompt: `Generate detailed content about: ${topic}`,
    };
    return {
        taskId: task.id,
        agentId: agent.id,
        status: "success",
        output,
        completedAt: new Date().toISOString(),
    };
};
