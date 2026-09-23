import { Agent } from "../agents/agent-types";
import { Task } from "../graph/task";
import { AgentExecutionResult } from "../agents/agent-types";

// Unreal executor import
import { runUnrealRender } from "../agents/unreal/unreal-render-executor";

export interface SandboxConfig {
  timeoutMs: number;
  allowNetwork: boolean;
  allowFilesystem: boolean;
}

export interface AgentSandboxContext {
  agent: Agent;
  task: Task;
  config: SandboxConfig;
}

export interface AgentSandbox {
  run(context: AgentSandboxContext): Promise<AgentExecutionResult>;
}

export const createAgentSandbox = (): AgentSandbox => ({
  async run(context: AgentSandboxContext): Promise<AgentExecutionResult> {
    const { agent, task } = context;

    // -----------------------------
    // REALM: UNREAL
    // -----------------------------
    if (agent.realm === "unreal") {
      const unrealConfig = {
        unrealExecutablePath:
          "C:\\Program Files\\Epic Games\\UE_5.8\\Engine\\Binaries\\Win64\\UnrealEditor.exe",
        projectPath:
          "C:\\Users\\Shane\\Documents\\dev\\PrimordiaOS\\PrimordiaUnreal\\PrimordiaUnreal.uproject",
        renderOutputDir:
          "C:\\Users\\Shane\\Documents\\dev\\PrimordiaOS\\renders",
      };

      return runUnrealRender({
        agent,
        task,
        config: unrealConfig,
      });
    }

    // -----------------------------
    // REALM: NODE (default fallback)
    // -----------------------------
    if (agent.realm === "node") {
      return {
        taskId: task.id,
        agentId: agent.id,
        status: "success",
        output: {
          message: `Node agent executed task '${task.name}'`,
        },
        completedAt: new Date().toISOString(),
      };
    }

    // -----------------------------
    // REALM: PRIMORDIAOS (placeholder)
    // -----------------------------
    if (agent.realm === "primordiaos") {
      return {
        taskId: task.id,
        agentId: agent.id,
        status: "success",
        output: {
          message: `PrimordiaOS agent executed task '${task.name}'`,
        },
        completedAt: new Date().toISOString(),
      };
    }

    // -----------------------------
    // REALM: AI CORE (placeholder)
    // -----------------------------
    if (agent.realm === "ai-core") {
      return {
        taskId: task.id,
        agentId: agent.id,
        status: "success",
        output: {
          message: `AI Core agent executed task '${task.name}'`,
        },
        completedAt: new Date().toISOString(),
      };
    }

    // -----------------------------
    // UNKNOWN REALM
    // -----------------------------
    return {
      taskId: task.id,
      agentId: agent.id,
      status: "failed",
      errorMessage: `Unknown agent realm: ${agent.realm}`,
      completedAt: new Date().toISOString(),
    };
  },
});
