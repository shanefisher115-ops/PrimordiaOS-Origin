// message-bus/swarm.js

import WebSocket from "ws";

const SWARM_URL = "ws://localhost:3002";

export async function broadcastToSwarm(payload) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(SWARM_URL);

        ws.on("open", () => {
            ws.send(JSON.stringify({
                type: "swarm-broadcast",
                payload
            }));
            ws.close();
            resolve();
        });

        ws.on("error", (err) => {
            console.error("[PrimordiaOS] Swarm broadcast error:", err);
            reject(err);
        });
    });
}
