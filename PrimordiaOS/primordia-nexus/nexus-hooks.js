// nexus-hooks.ts
// Primordia Nexus Hooks — full implementation
// Connects Nexus events to PrimordiaOS subsystems
import { eventBus } from "./primordia-core/shared/event-bus";
import { restartRuntime } from "./runtime";
export function registerNexusHooks() {
    console.log("[NexusHooks] Registering Nexus → PrimordiaOS hooks…");
    // Example: Nexus emits "nexus.reload" when user reloads the environment
    eventBus.subscribe("nexus.reload", async () => {
        console.log("[NexusHooks] Received reload event.");
        await restartRuntime();
    });
    // Example: Nexus emits "nexus.command" for CLI-like commands
    eventBus.subscribe("nexus.command", async (event) => {
        const { command, payload } = event.payload;
        console.log("[NexusHooks] Command received:", command);
        switch (command) {
            case "restart":
                await restartRuntime();
                break;
            case "emit":
                eventBus.emit(payload.topic, payload.data, "nexus");
                break;
            default:
                console.warn("[NexusHooks] Unknown command:", command);
        }
    });
    console.log("[NexusHooks] Hooks registered.");
}
