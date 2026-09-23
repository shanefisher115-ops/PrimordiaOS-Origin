import { Agent } from "../agent-types";
import { Task } from "../../graph/task";
import { AgentExecutionResult } from "../agent-types";
import fetch from "node-fetch";

export interface NetworkAgentConfig {
  defaultBaseUrl?: string;
}

export interface NetworkExecutorContext {
  agent: Agent;
  task: Task;
  config: NetworkAgentConfig;
}

export const runNetworkAction = async (
  context: NetworkExecutorContext,
): Promise<AgentExecutionResult> => {
  const { agent, task, config } = context;

  const url =
    (task.metadata?.["url"] as string) ||
    (config.defaultBaseUrl ?? "https://example.com");
  const body = task.metadata?.["body"] as any;

  try {
    if (task.name === "http_get") {
      const res = await fetch(url);
      const data = await res.text();
      return {
        taskId: task.id,
        agentId: agent.id,
        status: "success",
        output: { url, status: res.status, body: data },
        completedAt: new Date().toISOString(),
      };
    }

    if (task.name === "http_post") {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.text();
      return {
        taskId: task.id,
        agentId: agent.id,
        status: "success",
        output: { url, status: res.status, body: data },
        completedAt: new Date().toISOString(),
      };
    }

    return {
      taskId: task.id,
      agentId: agent.id,
      status: "failed",
      errorMessage: `Unsupported network task: ${task.name}`,
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
