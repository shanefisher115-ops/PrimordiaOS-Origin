import { Agent, AgentCapability } from "../agent-types";

export interface AICoreAgentConfig {
  model: string;
}

export interface AICoreAgentContext {
  config: AICoreAgentConfig;
}

export const createAICoreAgent = (
  context: AICoreAgentContext,
): Agent => {
  const capability: AgentCapability = {
    id: "cap-ai-core",
    name: "AI Core Capability",
    description: "General-purpose AI reasoning and text generation.",
    supportedTaskNames: ["ai_core_generate", "ai_core_chat"],
  };

  return {
    id: "agent-ai-core",
    name: "AICoreAgent",
    realm: "ai-core",
    capabilities: [capability],
  };
};
