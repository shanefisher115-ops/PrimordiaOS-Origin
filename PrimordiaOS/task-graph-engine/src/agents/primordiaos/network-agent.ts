import { Agent, AgentCapability } from "../agent-types";

export interface NetworkAgentConfig {
  defaultBaseUrl?: string;
}

export interface NetworkAgentContext {
  config: NetworkAgentConfig;
}

export const createNetworkAgent = (
  context: NetworkAgentContext,
): Agent => {
  const capability: AgentCapability = {
    id: "cap-network",
    name: "Network Capability",
    description: "Performs HTTP requests from PrimordiaOS.",
    supportedTaskNames: ["http_get", "http_post"],
  };

  return {
    id: "agent-network",
    name: "NetworkAgent",
    realm: "primordiaos",
    capabilities: [capability],
  };
};
