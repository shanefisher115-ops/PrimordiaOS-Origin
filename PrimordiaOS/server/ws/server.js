import { WebSocketServer } from "ws";
import { Kernel } from "../../kernel/core/kernel.js";
import { interpretSentence } from "../../kernel/runtime/interpreter.js";
export function startPrimordiaWSServer(port = 7777) {
    console.log("[PrimordiaOS] WebSocket server booting...");
    console.log(`[PrimordiaOS] WS Server running on port ${port}`);
    const wss = new WebSocketServer({ port });
    wss.on("connection", (socket) => {
        console.log("[PrimordiaOS] Unreal connected to WS server.");
        Kernel.emit("ws.server.connection", null);
        socket.on("message", async (msg) => {
            const text = msg.toString();
            console.log("[PrimordiaOS] Unreal →", text);
            try {
                const intent = await interpretSentence(text);
                console.log("[PrimordiaOS] Intent →", intent);
                // Optionally route into Kernel:
                // const result = Kernel.handleIntent(intent);
                // console.log("[PrimordiaOS] Result →", result);
            }
            catch (err) {
                console.error("[PrimordiaOS] Interpreter error:", err);
            }
        });
        socket.on("close", () => {
            console.log("[PrimordiaOS] Unreal disconnected.");
            Kernel.emit("ws.server.closed", null);
        });
    });
    return wss;
}
