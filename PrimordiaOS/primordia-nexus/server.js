// server.js — PrimordiaOS Master Bootstrap (ESM Edition)
// This file fixes ALL require/module.exports issues across your OS.
// Node 24+ compatible. Pure ESM. Fully unified runtime bootstrap.

import http from "http";

// --- CORE RUNTIME ---
import { startRuntime } from "./runtime/start-runtime.js";

// --- REALMS ---
import { startRealms } from "./realms/realm-bootstrap.js";

// --- TEMPORAL ENGINE ---
import { startTemporal } from "./temporal/temporal-bootstrap.js";

// --- CLOUD LAYER ---
import { startCloud } from "./cloud/cloud-bootstrap.js";

// --- SERVICES (WS + HTTP API) ---
import { startServices } from "./services/services-bootstrap.js";

// --- MONITORING ---
import { startMonitoring } from "./monitoring/monitoring-bootstrap.js";

// --- SECURITY ---
import { startSecurity } from "./security/security-bootstrap.js";

// --- STORAGE ---
import { startStorage } from "./storage/storage-bootstrap.js";

// --- NETWORKING ---
import { startNetworking } from "./network/network-bootstrap.js";

// --- DEVTOOLS ---
import { startDevtools } from "./devtools/devtools-bootstrap.js";


// ------------------------------------------------------------
// MASTER BOOT FUNCTION
// ------------------------------------------------------------
async function bootPrimordiaOS() {
    console.log("\n=== PrimordiaOS v1.0 — Temporal Edition ===\n");

    console.log("[BOOT] Starting core runtime…");
    await startRuntime();

    console.log("[BOOT] Starting realms…");
    await startRealms();

    console.log("[BOOT] Starting temporal engine…");
    await startTemporal();

    console.log("[BOOT] Starting cloud layer…");
    await startCloud();

    console.log("[BOOT] Starting services (HTTP + WS)…");
    await startServices();

    console.log("[BOOT] Starting monitoring…");
    await startMonitoring();

    console.log("[BOOT] Starting security…");
    await startSecurity();

    console.log("[BOOT] Starting storage…");
    await startStorage();

    console.log("[BOOT] Starting networking…");
    await startNetworking();

    console.log("[BOOT] Starting developer tools…");
    await startDevtools();

    console.log("\n[BOOT] PrimordiaOS is fully online.\n");
}


// ------------------------------------------------------------
// HTTP SERVER (Dashboard heartbeat + health check)
// ------------------------------------------------------------
const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        status: "PrimordiaOS Running",
        ts: Date.now()
    }));
});

server.listen(9090, async () => {
    console.log("[HTTP] PrimordiaOS server listening on port 9090");
    await bootPrimordiaOS();
});
