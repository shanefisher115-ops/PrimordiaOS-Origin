export type FaultEvent =
  | { type: "AGENT_CRASH"; agentId: string; realm: string; timestamp: number }
  | { type: "AGENT_DEAD"; agentId: string; realm: string; timestamp: number }
  | { type: "RETRY"; agentId: string; attempt: number; timestamp: number }
  | { type: "ROLLBACK"; agentId: string; depth: number; timestamp: number }
  | { type: "COMPACTION"; agentId: string; timestamp: number };
