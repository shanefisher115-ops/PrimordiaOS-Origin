export type AgentRealm =
  | "unreal"
  | "primordiaos"
  | "node"
  | "cloudflare"
  | "ai-core"
  | "external-api";

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  supportedTaskNames: string[];
}

export interface Agent {
  id: string;
  name: string;
  realm: AgentRealm;
  capabilities: AgentCapability[];
}

export interface AgentExecutionResult {
  taskId: string;
  agentId: string;
  status: "success" | "failed";
  output?: unknown;
  errorMessage?: string;
  completedAt: string;
}
