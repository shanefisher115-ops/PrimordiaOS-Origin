// devtools/dev-telemetry.ts
// PrimordiaOS Developer Telemetry — full implementation
// Tracks dev-mode metrics, reload counts, and debug events

import { metrics } from "../monitoring/metrics";
import { eventBus } from "../primordia-core/shared/event-bus";

export class DevTelemetry {
    private reloadCount = 0;

    start() {
        eventBus.subscribe("system.heartbeat", () => {
            metrics.increment("dev.heartbeat");
        });

        eventBus.subscribe("debug.reload", () => {
            this.reloadCount++;
            metrics.increment("dev.reloads");
        });

        console.log("[DevTelemetry] Developer telemetry active.");
    }

    getStats() {
        return {
            reloadCount: this.reloadCount,
            metrics: metrics.getSnapshot()
        };
    }
}

export const devTelemetry = new DevTelemetry();
