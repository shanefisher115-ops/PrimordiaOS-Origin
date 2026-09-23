// Hypergrowth Mode — PrimordiaOS

import { emitSignal } from "../core/signals";
import { MoneyPlugGraph } from "../moneyplug/graph";

export function checkHypergrowth(graph: MoneyPlugGraph, revenue: number) {
  if (revenue > 20) {
    // Hypergrowth trigger
    for (const node of graph.nodes) {
      node.weight *= 1.2; // amplify all nodes
    }

    emitSignal("amo.hypergrowth", {
      revenue,
      message: "Hypergrowth mode activated"
    });
  }
}
