import { Agent, AgentCapability } from "../agent-types";

export interface AIPromptAgentConfig {
  model: string;
}

export interface AIPromptAgentContext {
  config: AIPromptAgentConfig;
}

export const createAIPromptAgent = (
  context: AIPromptAgentContext,
): Agent => {
  const capability: AgentCapability = {
    id: "cap-ai-prompt",
    name: "AI Prompt Capability",
    description: "Generates prompts for other AI agents.",
    supportedTaskNames: ["ai_generate_prompt"],
  };

  return {
    id: "agent-ai-prompt",
    name: "AIPromptAgent",
    realm: "ai-core",
    capabilities: [capability],
  };
};
