export type GovernanceEvent =
  | { type: "COST_LIMIT_EXCEEDED"; agentId: string; cost: number; timestamp: number }
  | { type: "KILL_SWITCH_TRIGGERED"; agentId: string; reason: string; timestamp: number }
  | { type: "RATE_LIMITED"; agentId: string; count: number; timestamp: number }
  | { type: "SAFETY_RULE_VIOLATION"; agentId: string; rule: string; timestamp: number }
  | { type: "METRIC_UPDATE"; agentId: string; metric: string; value: number; timestamp: number };
