import { exec } from "child_process";
/**
 * Executes a render command inside Unreal Engine.
 * This uses the UnrealEditor.exe command-line interface.
 * Later you can replace this with a direct bridge or Python automation.
 */
export const runUnrealRender = async (context) => {
    const { agent, task, config } = context;
    // Basic command — you will customize this as your Unreal pipeline evolves
    const command = `"${config.unrealExecutablePath}" "${config.projectPath}" -run=RenderScene -output="${config.renderOutputDir}"`;
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
                    message: "Unreal render completed successfully.",
                    stdout,
                },
                completedAt: new Date().toISOString(),
            });
        });
    });
};
