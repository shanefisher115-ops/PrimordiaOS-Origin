export type ClaimEvent =
  | { type: "TASK_CLAIMED"; taskId: string; agentId: string; timestamp: number }
  | { type: "TASK_ALREADY_CLAIMED"; taskId: string; agentId: string; timestamp: number }
  | { type: "TASK_CLAIM_FAILED"; taskId: string; agentId: string; attempt: number; timestamp: number };
