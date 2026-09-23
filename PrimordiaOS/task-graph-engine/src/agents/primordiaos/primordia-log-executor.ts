import { Agent } from "../agent-types";
import { Task } from "../../graph/task";
import { AgentExecutionResult } from "../agent-types";
import * as fs from "fs";
import * as path from "path";

export interface PrimordiaLogAgentConfig {
  logFilePath: string;
}

export interface PrimordiaLogExecutorContext {
  agent: Agent;
  task: Task;
  config: PrimordiaLogAgentConfig;
}

export const runPrimordiaLogAction = async (
  context: PrimordiaLogExecutorContext,
): Promise<AgentExecutionResult> => {
  const { agent, task, config } = context;

  const logMessage =
    (task.metadata?.["message"] as string) || "No message provided.";
  const logData = {
    timestamp: new Date().toISOString(),
    taskId: task.id,
    agentId: agent.id,
    message: logMessage,
    metadata: task.metadata ?? {},
  };

  try {
    const dir = path.dirname(config.logFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.appendFileSync(
      config.logFilePath,
      JSON.stringify(logData) + "\n",
      "utf-8",
    );

    return {
      taskId: task.id,
      agentId: agent.id,
      status: "success",
      output: { message: "Log entry written.", logFilePath: config.logFilePath },
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
