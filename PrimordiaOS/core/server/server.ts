import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === "production";
const AUTO_SYNC = process.env.AUTO_SYNC_ENABLED === "true" || process.env.auto_sync_enabled === "true";

export function startPrimordiaWSServer(port: number = PORT) {
  console.log(`[PrimordiaOS] WebSocket server booting in ${IS_PROD ? 'PRODUCTION' : 'DEVELOPMENT'} mode...`);

  const wss = new WebSocketServer({ 
    port,
    perMessageDeflate: false 
  });

  console.log(`[PrimordiaOS] Production WS Server running on port ${port} (AutoSync: ${AUTO_SYNC})`);

  wss.on("connection", (socket, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`[PrimordiaOS] Live client connected from ${clientIp}`);

    socket.on("message", async (msg: Buffer) => {
      const text = msg.toString();
      console.log("[PrimordiaOS] Live Ingest →", text);

      try {
        // Attempt dynamic kernel event dispatch if kernel runtime is present
        try {
          const { Kernel } = await import("../../kernel/core/kernel.js");
          const { interpretSentence } = await import("../../kernel/runtime/interpreter.js");
          Kernel.emit("ws.server.message", { text, clientIp });
          const intent = await interpretSentence(text);
          console.log("[PrimordiaOS] Intent →", intent);
        } catch {
          // Sovereign standalone mode
        }
      } catch (err: any) {
        console.error("[PrimordiaOS] Interpreter error:", err?.message || err);
      }
    });

    socket.on("close", () => {
      console.log(`[PrimordiaOS] Client ${clientIp} disconnected.`);
    });

    socket.on("error", (err) => {
      console.error(`[PrimordiaOS] Client error:`, err.message);
    });
  });

  return wss;
}

// Auto-boot when running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startPrimordiaWSServer(PORT);
}
