// Primordia Kernel v2 — PrimordiaOS
// Unified scheduler with interrupts + priority-based realm scheduling
// + emergent behavior + behavior pattern evolution.

import { emitSignal } from "../core/signals";
import { routeToRealms } from "../realms/router";
import { processRealmFusion } from "../realms/fusion";
import { startOrganismTick } from "../core/organism";

import { processEmergentBehavior } from "../emergence/emergence";
import { processBehaviorPatterns } from "../emergence/patterns";

// ---------------------------------------------------------
// TYPES
// ---------------------------------------------------------

export type KernelInterruptType =
  | "hypergrowth"
  | "low_revenue"
  | "high_resonance"
  | "system_idle";

export interface KernelInterrupt {
  type: KernelInterruptType;
  priority: number;
  timestamp: number;
  payload?: Record<string, unknown>;
}

export interface KernelState {
  cycles: number;
  lastRevenue: number;
  lastDepth: number;
  uptimeStart: number;
  interrupts: KernelInterrupt[];
}

// ---------------------------------------------------------
// STATE
// ---------------------------------------------------------

export const kernelState: KernelState = {
  cycles: 0,
  lastRevenue: 0,
  lastDepth: 0,
  uptimeStart: Date.now(),
  interrupts: []
};

// ---------------------------------------------------------
// INTERRUPT SYSTEM
// ---------------------------------------------------------

function pushInterrupt(int: KernelInterrupt) {
  kernelState.interrupts.push(int);

  // Sort by priority (highest first)
  kernelState.interrupts.sort((a, b) => b.priority - a.priority);

  emitSignal("kernel.interrupt", int);
}

function evaluateInterrupts(revenue: number) {
  const now = Date.now();

  if (revenue > 50) {
    pushInterrupt({
      type: "hypergrowth",
      priority: 100,
      timestamp: now,
      payload: { revenue }
    });
  } else if (revenue < 1 && revenue > 0) {
    pushInterrupt({
      type: "low_revenue",
      priority: 60,
      timestamp: now,
      payload: { revenue }
    });
  } else if (revenue === 0) {
    pushInterrupt({
      type: "system_idle",
      priority: 40,
      timestamp: now
    });
  }
}

// ---------------------------------------------------------
// PRIORITY SCHEDULING
// ---------------------------------------------------------

function getRealmPriority(revenue: number) {
  if (revenue > 50) {
    return ["compute", "memory", "vision", "signal"];
  }
  if (revenue > 10) {
    return ["memory", "compute", "vision", "signal"];
  }
  return ["vision", "memory", "compute", "signal"];
}

// ---------------------------------------------------------
// KERNEL TICK
// ---------------------------------------------------------

export async function primordiaKernelTick(revenue: number, depth: number) {
  kernelState.cycles++;
  kernelState.lastRevenue = revenue;
  kernelState.lastDepth = depth;

  const uptime = Date.now() - kernelState.uptimeStart;

  // 1. Kernel heartbeat
  emitSignal("kernel.heartbeat", {
    cycle: kernelState.cycles,
    revenue,
    depth,
    uptime
  });

  // 2. Evaluate interrupts
  evaluateInterrupts(revenue);

  // 3. Determine realm scheduling order
  const realmOrder = getRealmPriority(revenue);

  emitSignal("kernel.schedule", {
    cycle: kernelState.cycles,
    realmOrder,
    revenue,
    depth
  });

  // 4. Route to realms
  await routeToRealms(revenue, depth);

  // 5. Fusion cortex
  processRealmFusion(revenue, depth);

  // 6. Emergent Behavior Engine
  processEmergentBehavior();

  // 7. Behavior Patterns evolution
  processBehaviorPatterns();

  // 8. Organism core
  await startOrganismTick({
    mode: "kernel",
    revenue,
    depth,
    realmOrder,
    interrupts: kernelState.interrupts.slice(0, 5)
  });

  return kernelState;
}
