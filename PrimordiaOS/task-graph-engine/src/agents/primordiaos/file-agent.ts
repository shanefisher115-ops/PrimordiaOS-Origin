import { Agent, AgentCapability } from "../agent-types";

export interface FileAgentConfig {
  rootPath: string;
}

export interface FileAgentContext {
  config: FileAgentConfig;
}

export const createFileAgent = (context: FileAgentContext): Agent => {
  const capability: AgentCapability = {
    id: "cap-file",
    name: "File Management Capability",
    description: "Reads, writes, and deletes files in PrimordiaOS.",
    supportedTaskNames: [
      "write_file",
      "read_file",
      "delete_file",
      "append_file",
    ],
  };

  return {
    id: "agent-file",
    name: "FileAgent",
    realm: "primordiaos",
    capabilities: [capability],
  };
};
