// services/websocket-bridge.ts
// PrimordiaOS WebSocket Bridge — full implementation
// Broadcasts PrimordiaOS events to connected WebSocket clients

import { WebSocketServer } from "ws";
import { eventBus, EventEnvelope } from "../primordia-core/shared/event-bus";

export class WebSocketBridge {
    private wss: WebSocketServer | null = null;
    private port: number;

    constructor(port = 9090) {
        this.port = port;
    }

    start() {
        this.wss = new WebSocketServer({ port: this.port });

        this.wss.on("connection", (ws) => {
            ws.send(JSON.stringify({ type: "connected", ts: Date.now() }));
        });

        eventBus.subscribe("*", (event: EventEnvelope) => {
            if (!this.wss) return;

            const message = JSON.stringify({
                type: "event",
                topic: event.topic,
                payload: event.payload,
                ts: event.timestamp
            });

            this.wss.clients.forEach((client) => {
                if (client.readyState === 1) {
                    client.send(message);
                }
            });
        });

        console.log(`[WebSocketBridge] Listening on port ${this.port}`);
    }

    stop() {
        if (this.wss) {
            this.wss.close();
            this.wss = null;
            console.log("[WebSocketBridge] Stopped.");
        }
    }
}

export const websocketBridge = new WebSocketBridge(9090);
