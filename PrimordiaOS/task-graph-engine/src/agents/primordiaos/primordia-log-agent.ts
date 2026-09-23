import { Agent, AgentCapability } from "../agent-types";

export interface PrimordiaLogAgentConfig {
  logFilePath: string;
}

export interface PrimordiaLogAgentContext {
  config: PrimordiaLogAgentConfig;
}

export const createPrimordiaLogAgent = (
  context: PrimordiaLogAgentContext,
): Agent => {
  const capability: AgentCapability = {
    id: "cap-primordia-log",
    name: "Primordia Logging Capability",
    description: "Writes structured logs to a PrimordiaOS log file.",
    supportedTaskNames: ["write_log_entry"],
  };

  return {
    id: "agent-primordia-log",
    name: "PrimordiaLogAgent",
    realm: "primordiaos",
    capabilities: [capability],
  };
};
