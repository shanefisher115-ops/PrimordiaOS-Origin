export interface EngineConfig {
  maxRetries: number;
  defaultPriority: "low" | "medium" | "high";
  agentTimeoutMs: number;
  loggingEnabled: boolean;
}

export const defaultEngineConfig: EngineConfig = {
  maxRetries: 3,
  defaultPriority: "medium",
  agentTimeoutMs: 60000,
  loggingEnabled: true,
};
