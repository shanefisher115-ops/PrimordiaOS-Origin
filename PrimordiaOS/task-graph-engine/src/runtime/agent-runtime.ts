import { Task } from "../graph/task";
import { AgentRegistry } from "../agents/agent-registry";
import { AgentExecutionResult, Agent } from "../agents/agent-types";
import { AgentSandbox, AgentSandboxContext } from "./agent-sandbox";

export interface RuntimeConfig {
  maxConcurrentAgents: number;
  defaultTimeoutMs: number;
}

export interface AgentRuntimeContext {
  agentRegistry: AgentRegistry;
  sandbox: AgentSandbox;
  config: RuntimeConfig;
}

export interface AgentRuntime {
  context: AgentRuntimeContext;
  runTask(task: Task): Promise<AgentExecutionResult>;
  runTasks(tasks: Task[]): Promise<AgentExecutionResult[]>;
}

export const createAgentRuntime = (
  context: AgentRuntimeContext,
): AgentRuntime => ({
  context,

  async runTask(task: Task): Promise<AgentExecutionResult> {
    const agent: Agent | undefined =
      this.context.agentRegistry.findForTask(task.name);

    if (!agent) {
      return {
        taskId: task.id,
        agentId: "none",
        status: "failed",
        errorMessage: `No agent found for task: ${task.name}`,
        completedAt: new Date().toISOString(),
      };
    }

    const sandboxContext: AgentSandboxContext = {
      agent,
      task,
      config: {
        timeoutMs: this.context.config.defaultTimeoutMs,
        allowNetwork: true,
        allowFilesystem: false,
      },
    };

    return this.context.sandbox.run(sandboxContext);
  },

  async runTasks(tasks: Task[]): Promise<AgentExecutionResult[]> {
    const results: AgentExecutionResult[] = [];
    for (const task of tasks) {
      const result = await this.runTask(task);
      results.push(result);
    }
    return results;
  },
});
