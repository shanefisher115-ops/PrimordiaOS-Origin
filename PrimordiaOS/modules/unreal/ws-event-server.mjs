import WebSocket, { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 17800 });

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "scene_plan") {
        // TODO: forward to Unreal via Blueprint bindings
        console.log("Scene plan received:", msg.payload);
      }
    } catch {}
  });
});

console.log("Primordia Unreal WS server on :17800");
