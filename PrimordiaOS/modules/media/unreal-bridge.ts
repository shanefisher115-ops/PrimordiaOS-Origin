import { WebSocket } from "ws";

const UNREAL_WS_URL = "ws://localhost:17800";

export async function sendScenePlanToUnreal(plan: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(UNREAL_WS_URL);

    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "scene_plan", payload: plan }));
    });

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "render_complete") {
          ws.close();
          resolve();
        }
      } catch {
        // ignore
      }
    });

    ws.on("error", (err) => reject(err));
  });
}
