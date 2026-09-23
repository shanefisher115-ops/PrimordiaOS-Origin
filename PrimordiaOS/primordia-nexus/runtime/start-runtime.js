// runtime/start-runtime.js
// ESM version — core runtime bootstrap

import { eventBus } from "../primordia-core/shared/event-bus.js";

export async function startRuntime() {
    console.log("[Runtime] Starting PrimordiaOS core runtime…");

    // Emit heartbeat every second
    setInterval(() => {
        eventBus.emit("system.heartbeat", { ts: Date.now() }, "runtime");
    }, 1000);

    console.log("[Runtime] Runtime active.");
}
