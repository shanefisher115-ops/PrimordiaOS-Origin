// devtools/debug-console.ts
// PrimordiaOS Debug Console — full implementation
// Allows live inspection, event emission, and runtime commands

import readline from "readline";
import { eventBus } from "../primordia-core/shared/event-bus";
import { restartRuntime } from "../runtime";

export class DebugConsole {
    private rl: readline.Interface | null = null;

    start() {
        console.log("[DebugConsole] Starting interactive console…");

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: "primordia> "
        });

        this.rl.prompt();

        this.rl.on("line", async (line) => {
            const trimmed = line.trim();

            if (trimmed === "exit") {
                this.stop();
                return;
            }

            if (trimmed === "restart") {
                await restartRuntime();
                console.log("[DebugConsole] Runtime restarted.");
                this.rl!.prompt();
                return;
            }

            if (trimmed.startsWith("emit ")) {
                const [, topic, ...rest] = trimmed.split(" ");
                const json = rest.join(" ");
                let payload = {};

                try {
                    payload = JSON.parse(json);
                } catch {
                    console.log("[DebugConsole] Invalid JSON payload.");
                }

                eventBus.emit(topic, payload, "debug");
                console.log(`[DebugConsole] Emitted "${topic}"`);
                this.rl!.prompt();
                return;
            }

            console.log("[DebugConsole] Unknown command.");
            this.rl!.prompt();
        });
    }

    stop() {
        if (this.rl) {
            this.rl.close();
            this.rl = null;
        }
        console.log("[DebugConsole] Stopped.");
    }
}

export const debugConsole = new DebugConsole();
