import { Agent } from "../agent-types";
import { Task } from "../../graph/task";
import { AgentExecutionResult } from "../agent-types";
import { exec } from "child_process";

export interface UnrealBlueprintAgentConfig {
  unrealExecutablePath: string;
  projectPath: string;
}

export interface UnrealBlueprintExecutorContext {
  agent: Agent;
  task: Task;
  config: UnrealBlueprintAgentConfig;
}

export const runUnrealBlueprint = async (
  context: UnrealBlueprintExecutorContext,
): Promise<AgentExecutionResult> => {
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
