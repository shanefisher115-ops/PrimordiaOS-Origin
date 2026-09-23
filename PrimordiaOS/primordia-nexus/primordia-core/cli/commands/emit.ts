// cli/commands/emit.ts
// Emit an event into PrimordiaOS

import { eventBus } from "../../primordia-core/shared/event-bus";

export async function emitCommand(args: string[]) {
    const topic = args[0];
    const json = args[1];

    if (!topic || !json) {
        console.log("Usage: primordia emit <topic> <json>");
        return;
    }

    let payload: any;

    try {
        payload = JSON.parse(json);
    } catch (err) {
        console.error("[CLI] Invalid JSON:", err);
        return;
    }

    console.log(`[CLI] Emitting event "${topic}" with payload:`, payload);

    eventBus.emit(topic, payload, "cli");
}
