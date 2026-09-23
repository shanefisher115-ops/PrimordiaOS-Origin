import { Goal } from "../goal/goal";
import { TaskGraph } from "../graph/graph";

export interface CreateGoalRequest {
  description: string;
  priority?: "low" | "medium" | "high";
}

export interface CreateGoalResponse {
  goal: Goal;
  graph: TaskGraph;
}

export interface ExecuteGraphRequest {
  graphId: string;
}

export interface ExecuteGraphResponse {
  graphId: string;
  status: "started" | "completed" | "failed";
}
