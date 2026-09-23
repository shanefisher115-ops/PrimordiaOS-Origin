import { eventBus } from "../core/eventBus.js";

export class TelemetryEvents {
  reportSpike(metric: string, val: number): void {
    eventBus.emit("telemetry:spike", { metric, val, timestamp: Date.now() });
  }
}