import * as fs from "fs";
import * as path from "path";
export const runDirectoryAction = async (context) => {
    const { agent, task, config } = context;
    const dirName = task.metadata?.["directoryName"] || "default";
    const fullPath = path.join(config.rootPath, dirName);
    try {
        if (task.name === "create_directory") {
            fs.mkdirSync(fullPath, { recursive: true });
            return {
                taskId: task.id,
                agentId: agent.id,
                status: "success",
                output: { message: `Directory created: ${fullPath}` },
                completedAt: new Date().toISOString(),
            };
        }
        if (task.name === "delete_directory") {
            fs.rmSync(fullPath, { recursive: true, force: true });
            return {
                taskId: task.id,
                agentId: agent.id,
                status: "success",
                output: { message: `Directory deleted: ${fullPath}` },
                completedAt: new Date().toISOString(),
            };
        }
        if (task.name === "list_directory") {
            const files = fs.readdirSync(fullPath);
            return {
                taskId: task.id,
                agentId: agent.id,
                status: "success",
                output: { path: fullPath, files },
                completedAt: new Date().toISOString(),
            };
        }
        return {
            taskId: task.id,
            agentId: agent.id,
            status: "failed",
            errorMessage: `Unsupported directory task: ${task.name}`,
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
