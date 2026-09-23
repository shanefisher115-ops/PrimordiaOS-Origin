import { Agent } from "../agent-types";
import { Task } from "../../graph/task";
import { AgentExecutionResult } from "../agent-types";

export interface AICodeAgentConfig {
  model: string;
}

export interface AICodeExecutorContext {
  agent: Agent;
  task: Task;
  config: AICodeAgentConfig;
}

export const runAICodeAction = async (
  context: AICodeExecutorContext,
): Promise<AgentExecutionResult> => {
  const { agent, task, config } = context;

  const prompt = task.metadata?.["prompt"] ?? "No prompt provided.";

  const output = {
    model: config.model,
    code: `// AI generated code\n// Prompt: ${prompt}`,
  };

  return {
    taskId: task.id,
    agentId: agent.id,
    status: "success",
    output,
    completedAt: new Date().toISOString(),
  };
};
