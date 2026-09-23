// monitoring/system-heartbeat.ts
// PrimordiaOS System Heartbeat — full implementation
// Emits periodic heartbeat events for monitoring and opportunity detection

import { eventBus } from "../primordia-core/shared/event-bus";

export class SystemHeartbeat {
    private timer: NodeJS.Timeout | null = null;

    start(interval = 2000) {
        console.log("[SystemHeartbeat] Starting heartbeat…");

        this.timer = setInterval(() => {
            eventBus.emit("system.heartbeat", { ts: Date.now() }, "heartbeat");
        }, interval);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        console.log("[SystemHeartbeat] Stopped.");
    }
}

export const systemHeartbeat = new SystemHeartbeat();
