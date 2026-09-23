export type TaskStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "retry"
  | "escalated";

export interface Task {
  id: string;
  goalId: string;
  name: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  assignedAgentId?: string;
  dependencies: string[];
  metadata?: Record<string, unknown>;
}
