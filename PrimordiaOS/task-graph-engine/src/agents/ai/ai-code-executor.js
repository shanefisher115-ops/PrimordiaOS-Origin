export const runAICodeAction = async (context) => {
    const { agent, task, config } = context;
    const prompt = task.metadata?.["prompt"] ?? "No prompt provided.";
    const output = {
        model: config.model,
        code: `// AI generated code\n// Prompt: ${prompt}`,
    };
    return {
        taskId: task.id,
        agentId: agent.id,
        status: "success",
        output,
        completedAt: new Date().toISOString(),
    };
};
