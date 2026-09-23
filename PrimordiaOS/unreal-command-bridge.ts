// bridge/unreal-command-bridge.ts

import WebSocket from "ws";
import { writeProof } from "../diagnostics/proof-log";

const unrealCmdSocket = new WebSocket("ws://localhost:8080/unreal/commands");

unrealCmdSocket.on("open", () => {
  console.log("[BRIDGE] Unreal command channel ready");
});

export type UnrealCommand = {
  type: string;
  payload: any;
};

export function sendUnrealCommand(cmd: UnrealCommand) {
  const msg = JSON.stringify(cmd);
  unrealCmdSocket.send(msg);
  writeProof("unreal-command", cmd);
}
