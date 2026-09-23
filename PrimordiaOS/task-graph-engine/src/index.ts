import { defaultEngineConfig } from "./config/engine-config";
import { createAgentRegistry } from "./agents/agent-registry";
import { createAgentRuntime } from "./runtime/agent-runtime";
import { createAgentSandbox } from "./runtime/agent-sandbox";
import { createTaskScheduler } from "./runtime/task-scheduler";
import { createRuntimeOrchestrator } from "./runtime/runtime-orchestrator";
import { createShellBridge } from "./runtime/primordia-shell-bridge";
import { TaskGraph } from "./graph/graph";
import { Task } from "./graph/task";

// TEMP: minimal fake graph for testing
const fakeTask = (id: string, name: string): Task => ({
  id,
  goalId: "goal-1",
  name,
  status: "pending",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  dependencies: [],
});

const fakeGraph: TaskGraph = {
  id: "graph-1",
  goalId: "goal-1",
  tasks: [
    fakeTask("task-1", "generate_prompts"),
    fakeTask("task-2", "render_unreal_scenes"),
  ],
  edges: [],
  createdAt: new Date().toISOString(),
};

async function main() {
  const agentRegistry = createAgentRegistry();

  // TEMP: register a single generic agent
  agentRegistry.register({
    id: "agent-generic",
    name: "GenericAgent",
    realm: "node",
    capabilities: [
      {
        id: "cap-generic",
        name: "Generic Capability",
        description: "Handles any task name for now.",
        supportedTaskNames: ["generate_prompts", "render_unreal_scenes"],
      },
    ],
  });

  const sandbox = createAgentSandbox();

  const runtime = createAgentRuntime({
    agentRegistry,
    sandbox,
    config: {
      maxConcurrentAgents: 2,
      defaultTimeoutMs: 60000,
    },
  });

  const scheduler = createTaskScheduler({
    maxConcurrentTasks: 2,
  });

  const orchestrator = createRuntimeOrchestrator({
    graph: fakeGraph,
    runtime,
    scheduler,
  });

  const shellBridge = createShellBridge();

  const result = await shellBridge.runGraph(fakeGraph, orchestrator);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error("Runtime error:", err);
});
