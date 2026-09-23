// network/network-bootstrap.ts
// PrimordiaOS Networking Bootstrap — full implementation
// Starts networking subsystems and registers routing rules

import { externalAPI } from "./external-api";
import { messageRouter } from "./message-router";

export async function startNetworking() {
    console.log("[Networking] Starting networking layer…");

    // Example: ping external API on startup
    const ping = await externalAPI.ping("https://example.com");
    console.log("[Networking] External API ping:", ping);

    console.log("[Networking] Message router active with rules:", messageRouter.listRules());
}

export async function stopNetworking() {
    console.log("[Networking] Networking layer stopped.");
}
