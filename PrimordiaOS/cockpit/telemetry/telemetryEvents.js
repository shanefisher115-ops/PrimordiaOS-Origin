import { eventBus } from "../core/eventBus.js";
export class TelemetryEvents {
    reportSpike(metric, val) {
        eventBus.emit("telemetry:spike", { metric, val, timestamp: Date.now() });
    }
}
