import { Agent, AgentCapability } from "../agent-types";

export interface DirectoryAgentConfig {
  rootPath: string;
}

export interface DirectoryAgentContext {
  config: DirectoryAgentConfig;
}

export const createDirectoryAgent = (
  context: DirectoryAgentContext,
): Agent => {
  const capability: AgentCapability = {
    id: "cap-directory",
    name: "Directory Management Capability",
    description: "Creates, deletes, and lists directories in PrimordiaOS.",
    supportedTaskNames: [
      "create_directory",
      "delete_directory",
      "list_directory",
    ],
  };

  return {
    id: "agent-directory",
    name: "DirectoryAgent",
    realm: "primordiaos",
    capabilities: [capability],
  };
};
