import { Agent } from "../agent-types";
import { Task } from "../../graph/task";
import { AgentExecutionResult } from "../agent-types";

export interface AIPromptAgentConfig {
  model: string;
}

export interface AIPromptExecutorContext {
  agent: Agent;
  task: Task;
  config: AIPromptAgentConfig;
}

export const runAIPromptAction = async (
  context: AIPromptExecutorContext,
): Promise<AgentExecutionResult> => {
  const { agent, task, config } = context;

  const topic = task.metadata?.["topic"] ?? "general";

  const output = {
    model: config.model,
    prompt: `Generate detailed content about: ${topic}`,
  };

  return {
    taskId: task.id,
    agentId: agent.id,
    status: "success",
    output,
    completedAt: new Date().toISOString(),
  };
};
