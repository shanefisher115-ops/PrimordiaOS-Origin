import { Agent } from "../agent-types";
import { Task } from "../../graph/task";
import { AgentExecutionResult } from "../agent-types";

export interface AICoreAgentConfig {
  model: string;
}

export interface AICoreExecutorContext {
  agent: Agent;
  task: Task;
  config: AICoreAgentConfig;
}

export const runAICoreAction = async (
  context: AICoreExecutorContext,
): Promise<AgentExecutionResult> => {
  const { agent, task, config } = context;

  const prompt = task.metadata?.["prompt"] ?? "No prompt provided.";

  const output = {
    model: config.model,
    response: `AI core response to: ${prompt}`,
  };

  return {
    taskId: task.id,
    agentId: agent.id,
    status: "success",
    output,
    completedAt: new Date().toISOString(),
  };
};
