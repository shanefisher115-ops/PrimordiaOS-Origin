import { Agent } from "../agent-types";
import { Task } from "../../graph/task";
import { AgentExecutionResult } from "../agent-types";
import { exec } from "child_process";

export interface ShellAgentConfig {
  workingDirectory: string;
}

export interface ShellExecutorContext {
  agent: Agent;
  task: Task;
  config: ShellAgentConfig;
}

export const runShellAction = async (
  context: ShellExecutorContext,
): Promise<AgentExecutionResult> => {
  const { agent, task, config } = context;

  const command =
    (task.metadata?.["command"] as string) || "echo No command provided";

  return new Promise(resolve => {
    exec(
      command,
      { cwd: config.workingDirectory },
      (error, stdout, stderr) => {
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
          output: { command, stdout },
          completedAt: new Date().toISOString(),
        });
      },
    );
  });
};
