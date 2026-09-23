// bridge/unreal-command-bridge.ts

import WebSocket from "ws";
import { writeProof } from "../diagnostics/proof-log";

let socket: WebSocket | null = null;

function ensureSocket() {
  if (!socket) {
    socket = new WebSocket("ws://localhost:8080/unreal/commands");

    socket.on("open", () => {
      console.log("[UNREAL BRIDGE] Connected");
    });

    socket.on("error", (err) => {
      console.error("[UNREAL BRIDGE ERROR]", err);
    });
  }
}

export function sendUnrealCommand(cmd: { type: string; payload: any }) {
  ensureSocket();
  socket!.send(JSON.stringify(cmd));
  writeProof("unreal-command", cmd);
}
