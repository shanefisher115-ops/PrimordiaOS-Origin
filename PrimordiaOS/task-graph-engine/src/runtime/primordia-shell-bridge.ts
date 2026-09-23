import { TaskGraph } from "../graph/graph";
import { RuntimeOrchestrator } from "./runtime-orchestrator";
import { AgentExecutionResult } from "../agents/agent-types";

export interface ShellCommandResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface ShellBridge {
  runGraph(graph: TaskGraph, orchestrator: RuntimeOrchestrator): Promise<ShellCommandResult>;
}

export const createShellBridge = (): ShellBridge => ({
  async runGraph(
    graph: TaskGraph,
    orchestrator: RuntimeOrchestrator,
  ): Promise<ShellCommandResult> {
    const results: AgentExecutionResult[] = await orchestrator.start();

    return {
      success: true,
      message: `Executed graph '${graph.id}' with ${results.length} tasks.`,
      data: results,
    };
  },
});
