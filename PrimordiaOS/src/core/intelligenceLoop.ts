// core/intelligenceLoop.ts

import { IntelligenceCoordinator } from "./intelligenceCoordinator";
import {
  CurrentStateSnapshot,
  RealmSignal,
  TemporalEvent,
  MemoryNode,
} from "./types";

export interface IntelligenceLoopSources {
  getState: () => Promise<CurrentStateSnapshot>;
  getRealmSignals: () => Promise<RealmSignal[]>;
  getTemporalEvents: () => Promise<TemporalEvent[]>;
  getMemoryNodes: () => Promise<MemoryNode[]>;
}

export interface IntelligenceLoopConfig {
  intervalMs: number;
  logSummary: boolean;
}

export class IntelligenceLoop {
  private coordinator: IntelligenceCoordinator;
  private sources: IntelligenceLoopSources;
  private config: IntelligenceLoopConfig;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    coordinator: IntelligenceCoordinator,
    sources: IntelligenceLoopSources,
    config: IntelligenceLoopConfig = {
      intervalMs: 5000,
      logSummary: true,
    }
  ) {
    this.coordinator = coordinator;
    this.sources = sources;
    this.config = config;
  }

  start() {
    console.log("PrimordiaOS Intelligence Loop: STARTED");

    this.timer = setInterval(async () => {
      try {
        const state = await this.sources.getState();
        const signals = await this.sources.getRealmSignals();
        const temporal = await this.sources.getTemporalEvents();
        const memory = await this.sources.getMemoryNodes();

        const summary = await this.coordinator.runCycle(
          state,
          signals,
          temporal,
          memory
        );

        if (this.config.logSummary) {
          console.log("Intelligence Cycle Summary:", summary);
        }
      } catch (err) {
        console.error("Intelligence Loop Error:", err);
      }
    }, this.config.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log("PrimordiaOS Intelligence Loop: STOPPED");
    }
  }
}
