// continuity/continuityCoordinator.ts

import { SystemAgingMonitor } from "./systemAgingMonitor";
import { LongTermMemoryCompressor } from "./longTermMemoryCompressor";
import { RealmLifecycleManager } from "./realmLifecycleManager";
import { SystemContinuityGovernor } from "./systemContinuityGovernor";
import {
  ContinuitySummary,
  MemoryNode,
  CurrentStateSnapshot,
} from "./types";

export class ContinuityCoordinator {
  private agingMonitor: SystemAgingMonitor;
  private memoryCompressor: LongTermMemoryCompressor;
  private lifecycleManager: RealmLifecycleManager;
  private governor: SystemContinuityGovernor;

  constructor(
    agingMonitor: SystemAgingMonitor,
    memoryCompressor: LongTermMemoryCompressor,
    lifecycleManager: RealmLifecycleManager,
    governor: SystemContinuityGovernor
  ) {
    this.agingMonitor = agingMonitor;
    this.memoryCompressor = memoryCompressor;
    this.lifecycleManager = lifecycleManager;
    this.governor = governor;
  }

  runContinuityCycle(
    current: CurrentStateSnapshot,
    memoryNodes: MemoryNode[]
  ): ContinuitySummary {
    const snapshot = this.agingMonitor.computeSnapshot(
      current.driftScore,
      current.stalenessScore,
      current.globalHealthScore
    );

    const agingInsights = this.agingMonitor.analyze(snapshot);

    const compressedBlocks = this.memoryCompressor.compress(memoryNodes);

    const lifecycleEvents = this.lifecycleManager.evaluate();

    const directives = this.governor.generateDirectives(
      agingInsights,
      lifecycleEvents
    );

    return {
      timestamp: Date.now(),
      agingInsightCount: agingInsights.length,
      compressedBlockCount: compressedBlocks.length,
      lifecycleEventCount: lifecycleEvents.length,
      directiveCount: directives.length,
      message: "Continuity cycle completed successfully.",
    };
  }
}
