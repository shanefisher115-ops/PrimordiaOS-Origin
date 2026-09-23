import fs from "fs";
import path from "path";

const ROOT = "C:/Users/Shane/PrimordiaWorldProject/PrimordiaOS";
const BRIDGE_DIR = path.join(ROOT, "Bridge");
const BRIDGE_FILE = path.join(BRIDGE_DIR, "bridge.mjs");

// Ensure required folders exist
fs.mkdirSync(ROOT, { recursive: true });
fs.mkdirSync(BRIDGE_DIR, { recursive: true });

const BRIDGE = `
import WebSocket from "ws";

const ws = new WebSocket("wss://primordiaos-cloudflare-gateway");

ws.on("open", () => {
    console.log("PrimordiaOS Bridge: Connected to Cloudflare Gateway");
});

ws.on("message", (msg) => {
    console.log("PrimordiaOS Bridge Message:", msg.toString());
});
`;

fs.writeFileSync(BRIDGE_FILE, BRIDGE);

console.log("PrimordiaOS AC: Simulation bridge installed.");
