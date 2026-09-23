export type GoalPriority = "low" | "medium" | "high";

export interface Goal {
  id: string;
  description: string;
  createdAt: string;
  priority: GoalPriority;
  metadata?: Record<string, unknown>;
}
