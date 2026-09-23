import { startUnrealWebSocketBridge } from "./websocket-client.js";

let ws: any;

export function startUnrealBridge() {
  ws = startUnrealWebSocketBridge("ws://localhost:7777/primordia");
}

export async function sendToUnreal(command: any) {
  if (!ws || ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(command));
}
