import { TaskGraph } from "../graph/graph";
import { AgentRegistry } from "../agents/agent-registry";
import { AgentExecutionResult } from "../agents/agent-types";

export interface ExecutionContext {
  graph: TaskGraph;
  agentRegistry: AgentRegistry;
}

export interface TaskExecutor {
  executeGraph(context: ExecutionContext): Promise<AgentExecutionResult[]>;
}
