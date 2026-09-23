import { Agent } from "../agent-types";
import { Task } from "../../graph/task";
import { AgentExecutionResult } from "../agent-types";
import * as fs from "fs";
import * as path from "path";

export interface DirectoryAgentConfig {
  rootPath: string;
}

export interface DirectoryExecutorContext {
  agent: Agent;
  task: Task;
  config: DirectoryAgentConfig;
}

export const runDirectoryAction = async (
  context: DirectoryExecutorContext,
): Promise<AgentExecutionResult> => {
  const { agent, task, config } = context;

  const dirName = (task.metadata?.["directoryName"] as string) || "default";
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
  } catch (err: any) {
    return {
      taskId: task.id,
      agentId: agent.id,
      status: "failed",
      errorMessage: err.message,
      completedAt: new Date().toISOString(),
    };
  }
};
