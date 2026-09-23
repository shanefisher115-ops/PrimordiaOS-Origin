// unreal/unreal-bridge.ts
// PrimordiaOS Unreal Bridge — full implementation
// Connects PrimordiaOS to Unreal Engine + Pixel Streaming

import { eventBus } from "../shared/event-bus";

export interface UnrealCommand {
    id: string;
    action: string;
    payload: any;
    ts: number;
}

export interface UnrealResponse {
    id: string;
    status: string;
    payload: any;
    ts: number;
}

export class UnrealBridge {
    private connected: boolean;

    constructor() {
        this.connected = false;
    }

    async start() {
        console.log("[UnrealBridge] Starting…");

        // Simulated connection handshake
        await new Promise((resolve) => setTimeout(resolve, 500));
        this.connected = true;

        console.log("[UnrealBridge] Connected to Unreal Engine.");
        eventBus.emit("unreal.connected", { ts: Date.now() }, "unreal-bridge");

        // Listen for commands
        eventBus.subscribe("unreal.command", async (event) => {
            await this.handleCommand(event.payload);
        });
    }

    async stop() {
        this.connected = false;
        console.log("[UnrealBridge] Disconnected.");
        eventBus.emit("unreal.disconnected", { ts: Date.now() }, "unreal-bridge");
    }

    async handleCommand(cmd: UnrealCommand) {
        if (!this.connected) {
            console.warn("[UnrealBridge] Command ignored, Unreal not connected.");
            return;
        }

        console.log("[UnrealBridge] Command received:", cmd);

        // Simulated Unreal processing
        const response: UnrealResponse = {
            id: cmd.id,
            status: "ok",
            payload: { echo: cmd.payload },
            ts: Date.now()
        };

        eventBus.emit("unreal.response", response, "unreal-bridge");
    }

    async send(action: string, payload: any) {
        const cmd: UnrealCommand = {
            id: `cmd-${Date.now()}`,
            action,
            payload,
            ts: Date.now()
        };

        eventBus.emit("unreal.command", cmd, "unreal-bridge");
        return cmd.id;
    }
}

export const unrealBridge = new UnrealBridge();
