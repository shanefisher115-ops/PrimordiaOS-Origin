import WebSocket from "ws";
import { emit } from "../../kernel/automation/event-bus.js";
export function startUnrealWebSocketBridge(url) {
    const ws = new WebSocket(url);
    ws.on("open", () => {
        emit({
            id: `unreal-connected-${Date.now()}`,
            type: "unreal",
            source: "unreal-bridge",
            payload: { ok: true, event: "connected" },
            timestamp: Date.now(),
        });
    });
    ws.on("message", (data) => {
        let msg;
        try {
            msg = JSON.parse(data.toString());
        }
        catch {
            return;
        }
        emit({
            id: `unreal-event-${Date.now()}`,
            type: "unreal",
            source: "unreal",
            payload: msg,
            timestamp: Date.now(),
        });
    });
    ws.on("close", () => {
        emit({
            id: `unreal-disconnected-${Date.now()}`,
            type: "unreal",
            source: "unreal-bridge",
            payload: { ok: false, event: "disconnected" },
            timestamp: Date.now(),
        });
    });
    return ws;
}
