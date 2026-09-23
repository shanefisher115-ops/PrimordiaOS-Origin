import { Agent } from "../agent-types";
import { Task } from "../../graph/task";
import { AgentExecutionResult } from "../agent-types";
import { exec } from "child_process";

export interface UnrealMaterialAgentConfig {
  unrealExecutablePath: string;
  projectPath: string;
}

export interface UnrealMaterialExecutorContext {
  agent: Agent;
  task: Task;
  config: UnrealMaterialAgentConfig;
}

export const runUnrealMaterialAction = async (
  context: UnrealMaterialExecutorContext,
): Promise<AgentExecutionResult> => {
  const { agent, task, config } = context;

  const command = `"${config.unrealExecutablePath}" "${config.projectPath}" -run=MaterialAction`;

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
          message: "Unreal material action completed.",
          stdout,
        },
        completedAt: new Date().toISOString(),
      });
    });
  });
};
