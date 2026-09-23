import { Task } from "./task";

export interface TaskEdge {
  fromTaskId: string;
  toTaskId: string;
}

export interface TaskGraph {
  id: string;
  goalId: string;
  tasks: Task[];
  edges: TaskEdge[];
  createdAt: string;
}

export interface GraphBuilder {
  buildFromGoal(goalDescription: string): TaskGraph;
}
