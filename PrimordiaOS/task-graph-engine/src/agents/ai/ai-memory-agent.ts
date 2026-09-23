import { Agent, AgentCapability } from "../agent-types";

export interface AIMemoryAgentConfig {
  memoryPath: string;
}

export interface AIMemoryAgentContext {
  config: AIMemoryAgentConfig;
}

export const createAIMemoryAgent = (
  context: AIMemoryAgentContext,
): Agent => {
  const capability: AgentCapability = {
    id: "cap-ai-memory",
    name: "AI Memory Capability",
    description: "Stores and retrieves long-term AI memory.",
    supportedTaskNames: ["ai_memory_store", "ai_memory_retrieve"],
  };

  return {
    id: "agent-ai-memory",
    name: "AIMemoryAgent",
    realm: "ai-core",
    capabilities: [capability],
  };
};
