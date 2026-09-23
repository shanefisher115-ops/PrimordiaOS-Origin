import { Agent } from "../agent-types";
import { Task } from "../../graph/task";
import { AgentExecutionResult } from "../agent-types";
import * as fs from "fs";
import * as path from "path";

export interface FileAgentConfig {
  rootPath: string;
}

export interface FileExecutorContext {
  agent: Agent;
  task: Task;
  config: FileAgentConfig;
}

export const runFileAction = async (
  context: FileExecutorContext,
): Promise<AgentExecutionResult> => {
  const { agent, task, config } = context;

  const fileName = (task.metadata?.["fileName"] as string) || "default.txt";
  const content = (task.metadata?.["content"] as string) || "";
  const fullPath = path.join(config.rootPath, fileName);

  try {
    if (task.name === "write_file") {
      fs.writeFileSync(fullPath, content, "utf-8");
      return {
        taskId: task.id,
        agentId: agent.id,
        status: "success",
        output: { message: `File written: ${fullPath}` },
        completedAt: new Date().toISOString(),
      };
    }

    if (task.name === "append_file") {
      fs.appendFileSync(fullPath, content, "utf-8");
      return {
        taskId: task.id,
        agentId: agent.id,
        status: "success",
        output: { message: `File appended: ${fullPath}` },
        completedAt: new Date().toISOString(),
      };
    }

    if (task.name === "read_file") {
      const data = fs.readFileSync(fullPath, "utf-8");
      return {
        taskId: task.id,
        agentId: agent.id,
        status: "success",
        output: { path: fullPath, content: data },
        completedAt: new Date().toISOString(),
      };
    }

    if (task.name === "delete_file") {
      fs.rmSync(fullPath, { force: true });
      return {
        taskId: task.id,
        agentId: agent.id,
        status: "success",
        output: { message: `File deleted: ${fullPath}` },
        completedAt: new Date().toISOString(),
      };
    }

    return {
      taskId: task.id,
      agentId: agent.id,
      status: "failed",
      errorMessage: `Unsupported file task: ${task.name}`,
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
