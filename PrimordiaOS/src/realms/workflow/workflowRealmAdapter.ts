// realms/workflow/workflowRealmAdapter.ts

import { signalBus } from "../../state/signalBus";
import { realmRegistry } from "../../state/realmRegistry";
import { memoryGraph } from "../../state/memoryGraphInstance";

export class WorkflowRealmAdapter {
  recordTaskCompletion(taskId: string, durationMs: number) {
    const timestamp = Date.now();

    realmRegistry.markActive("workflow");

    signalBus.emit({
      id: `workflow-task-${taskId}-${timestamp}`,
      realm: "workflow",
      strength: Math.min(1, durationMs / 10000),
      payload: { taskId, durationMs },
      timestamp,
    });

    memoryGraph.upsertNode({
      id: `workflow-mem-${timestamp}`,
      kind: "TaskCompletion",
      label: taskId,
      importance: 0.4,
      payload: { durationMs },
      timestamp,
    });
  }

  recordPipelineEvent(event: any) {
    const timestamp = Date.now();

    realmRegistry.markActive("workflow");

    signalBus.emit({
      id: `workflow-pipeline-${timestamp}`,
      realm: "workflow",
      strength: 0.5,
      payload: event,
      timestamp,
    });

    memoryGraph.upsertNode({
      id: `workflow-pipe-${timestamp}`,
      kind: "PipelineEvent",
      label: "pipeline",
      importance: 0.3,
      payload: event,
      timestamp,
    });
  }
}

export const workflowRealm = new WorkflowRealmAdapter();
