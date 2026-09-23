// ============================================================
//  PRIMORDIAOS // UNREAL BRIDGE SERVICE
//  Location: C:/Users/Shane/Documents/dev/PrimordiaOS/services/unreal-bridge.mjs
//  Mode: Cinematic + Real
// ============================================================

import WebSocket from "ws";
import { globalEventBus } from "../core/event-bus.mjs";

// ============================================================
//  CONFIG
// ============================================================

const UNREAL_WS_URL = "ws://localhost:7777"; // adjust to your Unreal bridge port

// ============================================================
//  STATE
// ============================================================

let ws = null;
let isConnected = false;

// ============================================================
//  CINEMATIC BOOT LOGS
// ============================================================

console.log("✦ [UnrealBridge] Initializing PrimordiaOS ↔ Unreal Engine bridge...");
console.log("✦ [UnrealBridge] World generator listening for realm-binding pulses...");
console.log("✦ [UnrealBridge] Awaiting Unreal handshake...");

// ============================================================
//  CONNECT TO UNREAL
// ============================================================

function connectToUnreal() {
  console.log(`✦ [UnrealBridge] Connecting to Unreal at ${UNREAL_WS_URL}...`);

  ws = new WebSocket(UNREAL_WS_URL);

  ws.on("open", () => {
    isConnected = true;
    console.log("✦ [UnrealBridge] WebSocket connection to Unreal: ONLINE");
    globalEventBus.emit("unreal", "bridge:connected", { ts: Date.now() });
  });

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleUnrealMessage(msg);
    } catch (err) {
      console.error("✦ [UnrealBridge] Failed to parse Unreal message:", err);
    }
  });

  ws.on("close", () => {
    isConnected = false;
    console.log("✦ [UnrealBridge] WebSocket connection to Unreal: CLOSED");
    globalEventBus.emit("unreal", "bridge:disconnected", { ts: Date.now() });
    setTimeout(connectToUnreal, 3000); // retry
  });

  ws.on("error", (err) => {
    console.error("✦ [UnrealBridge] WebSocket error:", err);
  });
}

// ============================================================
//  HANDLE MESSAGES FROM UNREAL
// ============================================================

function handleUnrealMessage(msg) {
  console.log(
    `✦ [UnrealBridge] Incoming Unreal message: ${JSON.stringify(msg)}`
  );

  if (msg.type === "world_status") {
    globalEventBus.emit("unreal", "world:status", msg);
  }

  if (msg.type === "log") {
    console.log(`✦ [UnrealBridge::UnrealLog] ${msg.message}`);
  }
}

// ============================================================
//  SEND MESSAGES TO UNREAL
// ============================================================

function sendToUnreal(payload) {
  if (!isConnected || !ws) {
    console.warn("✦ [UnrealBridge] Cannot send to Unreal: not connected.");
    return;
  }
  ws.send(JSON.stringify(payload));
}

// ============================================================
//  EVENT BUS LISTENERS
// ============================================================

globalEventBus.on("unreal", "bridge:init", () => {
  console.log("✦ [UnrealBridge] Realm init pulse received. Connecting to Unreal...");
  connectToUnreal();
});

globalEventBus.on("unreal", "world:spawn", (payload) => {
  console.log(
    `✦ [UnrealBridge] World spawn request: ${JSON.stringify(payload)}`
  );
  sendToUnreal({
    type: "world_spawn",
    ...payload,
  });
});

globalEventBus.on("unreal", "world:command", (payload) => {
  console.log(
    `✦ [UnrealBridge] World command: ${JSON.stringify(payload)}`
  );
  sendToUnreal({
    type: "world_command",
    ...payload,
  });
});

// ============================================================
//  SERVICE START
// ============================================================

console.log("✦ [UnrealBridge] Service online. Awaiting PrimordiaOS pulses...");
