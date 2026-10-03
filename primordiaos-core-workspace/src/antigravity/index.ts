import { primordiaFlow } from "../primordiaflow";
import { moneyPlugHub } from "../moneyplughub";
import { aetherflow } from "../aetherflow";

export interface AntigravityScore {
  domain: "flow" | "money-channel" | "aether-task";
  id: string;
  score: number;
  reason: string;
}

export interface AntigravityReport {
  flows: AntigravityScore[];
  channels: AntigravityScore[];
  tasks: AntigravityScore[];
}

export class PrimordialAntigravity {
  evaluate(): AntigravityReport {
    const flowIds = primordiaFlow.listIds();
    const channels = moneyPlugHub.listChannels();
    const tasks = aetherflow.listTasks();

    const flowScores: AntigravityScore[] = flowIds.map((id) => {
      const graph = primordiaFlow.get(id);
      const nodeCount = graph ? graph.nodes.length : 0;
      const score = Math.min(1, nodeCount / 10);
      return {
        domain: "flow",
        id,
        score,
        reason: nodeCount === 0
          ? "no-nodes-collapse-risk"
          : "graph-has-" + nodeCount + "-nodes"
      };
    });

    const channelScores: AntigravityScore[] = channels.map((c) => {
      return {
        domain: "money-channel",
        id: c.name,
        score: 0.7,
        reason: "channel-present:" + (c.description ?? "no-description")
      };
    });

    const taskScores: AntigravityScore[] = tasks.map((t) => {
      return {
        domain: "aether-task",
        id: t.id,
        score: 0.5,
        reason: "task-kind:" + t.kind + " source:" + t.source + " target:" + t.target
      };
    });

    return {
      flows: flowScores,
      channels: channelScores,
      tasks: taskScores
    };
  }
}

export const antigravity = new PrimordialAntigravity();
