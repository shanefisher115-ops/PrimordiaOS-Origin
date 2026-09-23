import { Agent, AgentCapability } from "../agent-types";

export interface AIAnalysisAgentConfig {
  model: string;
}

export interface AIAnalysisAgentContext {
  config: AIAnalysisAgentConfig;
}

export const createAIAnalysisAgent = (
  context: AIAnalysisAgentContext,
): Agent => {
  const capability: AgentCapability = {
    id: "cap-ai-analysis",
    name: "AI Analysis Capability",
    description: "Performs reasoning, analysis, and structured interpretation.",
    supportedTaskNames: ["ai_analyze", "ai_reason"],
  };

  return {
    id: "agent-ai-analysis",
    name: "AIAnalysisAgent",
    realm: "ai-core",
    capabilities: [capability],
  };
};
