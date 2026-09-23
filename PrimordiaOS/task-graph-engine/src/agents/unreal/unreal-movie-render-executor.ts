import { Agent } from "../agent-types";
import { Task } from "../../graph/task";
import { AgentExecutionResult } from "../agent-types";
import { exec } from "child_process";

export interface UnrealMovieRenderAgentConfig {
  unrealExecutablePath: string;
  projectPath: string;
  outputDir: string;
}

export interface UnrealMovieRenderExecutorContext {
  agent: Agent;
  task: Task;
  config: UnrealMovieRenderAgentConfig;
}

export const runUnrealMovieRender = async (
  context: UnrealMovieRenderExecutorContext,
): Promise<AgentExecutionResult> => {
  const { agent, task, config } = context;

  const command = `"${config.unrealExecutablePath}" "${config.projectPath}" -run=MovieRender -output="${config.outputDir}"`;

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
          message: "Unreal movie render completed.",
          stdout,
        },
        completedAt: new Date().toISOString(),
      });
    });
  });
};
