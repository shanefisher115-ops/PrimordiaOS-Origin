import { Agent } from "../agent-types";
import { Task } from "../../graph/task";
import { AgentExecutionResult } from "../agent-types";

export interface AIAnalysisAgentConfig {
  model: string;
}

export interface AIAnalysisExecutorContext {
  agent: Agent;
  task: Task;
  config: AIAnalysisAgentConfig;
}

export const runAIAnalysis = async (
  context: AIAnalysisExecutorContext,
): Promise<AgentExecutionResult> => {
  const { agent, task, config } = context;

  const input = task.metadata?.["input"] ?? "No input provided.";

  const output = {
    model: config.model,
    analysis: `AI analysis of: ${input}`,
  };

  return {
    taskId: task.id,
    agentId: agent.id,
    status: "success",
    output,
    completedAt: new Date().toISOString(),
  };
};
