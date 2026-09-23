// message-bus/swarm-server.js
import WebSocket, { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 3002 });

console.log("[PrimordiaOS] Swarm server online on port 3002");

wss.on("connection", ws => {
    console.log("[SWARM] client connected");

    ws.on("message", msg => {
        console.log("[SWARM] incoming:", msg.toString());
    });
});
