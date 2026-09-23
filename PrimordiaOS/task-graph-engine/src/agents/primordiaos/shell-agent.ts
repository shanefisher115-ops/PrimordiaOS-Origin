import { Agent, AgentCapability } from "../agent-types";

export interface ShellAgentConfig {
  workingDirectory: string;
}

export interface ShellAgentContext {
  config: ShellAgentConfig;
}

export const createShellAgent = (context: ShellAgentContext): Agent => {
  const capability: AgentCapability = {
    id: "cap-shell",
    name: "Shell Command Capability",
    description: "Executes shell commands in PrimordiaOS.",
    supportedTaskNames: ["run_shell_command"],
  };

  return {
    id: "agent-shell",
    name: "ShellAgent",
    realm: "primordiaos",
    capabilities: [capability],
  };
};
