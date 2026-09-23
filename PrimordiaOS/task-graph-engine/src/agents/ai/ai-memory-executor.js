import * as fs from "fs";
export const runAIMemoryAction = async (context) => {
    const { agent, task, config } = context;
    try {
        if (task.name === "ai_memory_store") {
            const data = JSON.stringify(task.metadata ?? {}, null, 2);
            fs.appendFileSync(config.memoryPath, data + "\n");
            return {
                taskId: task.id,
                agentId: agent.id,
                status: "success",
                output: { message: "Memory stored." },
                completedAt: new Date().toISOString(),
            };
        }
        if (task.name === "ai_memory_retrieve") {
            const content = fs.readFileSync(config.memoryPath, "utf-8");
            return {
                taskId: task.id,
                agentId: agent.id,
                status: "success",
                output: { memory: content },
                completedAt: new Date().toISOString(),
            };
        }
        return {
            taskId: task.id,
            agentId: agent.id,
            status: "failed",
            errorMessage: `Unsupported memory task: ${task.name}`,
            completedAt: new Date().toISOString(),
        };
    }
    catch (err) {
        return {
            taskId: task.id,
            agentId: agent.id,
            status: "failed",
            errorMessage: err.message,
            completedAt: new Date().toISOString(),
        };
    }
};
