// services/services-bootstrap.ts
// PrimordiaOS Services Bootstrap — full implementation
// Starts HTTP server, WebSocket bridge, and Nexus dashboard
import { httpServer } from "./http-server";
import { websocketBridge } from "./websocket-bridge";
import { nexusDashboard } from "./nexus-dashboard";
export async function startServices() {
    console.log("[Services] Starting HTTP server…");
    httpServer.start();
    console.log("[Services] Starting WebSocket bridge…");
    websocketBridge.start();
    console.log("[Services] Starting Nexus dashboard…");
    nexusDashboard.start();
    console.log("[Services] All services started.");
}
export async function stopServices() {
    console.log("[Services] Stopping services…");
    httpServer.stop();
    websocketBridge.stop();
    console.log("[Services] Services stopped.");
}
