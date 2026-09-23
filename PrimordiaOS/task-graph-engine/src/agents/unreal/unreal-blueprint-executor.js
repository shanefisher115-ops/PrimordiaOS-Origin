import { exec } from "child_process";
export const runUnrealBlueprint = async (context) => {
    const { agent, task, config } = context;
    const command = `"${config.unrealExecutablePath}" "${config.projectPath}" -run=BlueprintAction`;
    return new Promise(resolve => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                resolve({
                    taskId: task.id,
                    agentId: agent.id,
                    status: "failed",
                    errorMessage: stderr || error.message,
                    completedAt: new Date().toISOString(),
                });
                return;
            }
            resolve({
                taskId: task.id,
                agentId: agent.id,
                status: "success",
                output: {
                    message: "Unreal blueprint action completed.",
                    stdout,
                },
                completedAt: new Date().toISOString(),
            });
        });
    });
};
