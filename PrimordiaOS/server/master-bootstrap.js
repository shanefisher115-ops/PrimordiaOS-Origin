import { Kernel } from "../kernel/core/kernel.js";
import { startPrimordiaWSServer } from "./ws/server.js";
import express from "express";
const HTTP_PORT = 8080;
const WS_PORT = 7777;
function startKernel() {
    console.log("[PrimordiaOS] Kernel backend booting...");
    Kernel.init();
    console.log("[PrimordiaOS] Kernel backend ready.");
}
function startHttpBackend() {
    console.log("[PrimordiaOS] HTTP backend booting...");
    const app = express();
    app.use(express.json());
    app.get("/status", (_req, res) => {
        res.json({ ok: true, msg: "PrimordiaOS online" });
    });
    app.post("/intent", (req, res) => {
        const intent = req.body;
        const result = Kernel.handleIntent(intent);
        res.json(result);
    });
    const server = app.listen(HTTP_PORT, () => {
        console.log(`[PrimordiaOS] HTTP Server running on port ${HTTP_PORT}`);
    });
    return server;
}
function startWsBackend() {
    console.log("[PrimordiaOS] WS backend booting...");
    const wss = startPrimordiaWSServer(WS_PORT);
    console.log("[PrimordiaOS] WS backend ready.");
    return wss;
}
export function startPrimordiaMaster() {
    console.log("=== PrimordiaOS Master Bootstrap ===");
    startKernel();
    const httpServer = startHttpBackend();
    const wsServer = startWsBackend();
    process.on("SIGINT", () => {
        console.log("\n[PrimordiaOS] Shutting down...");
        httpServer.close(() => {
            console.log("[PrimordiaOS] HTTP backend stopped.");
        });
        wsServer.close(() => {
            console.log("[PrimordiaOS] WS backend stopped.");
            process.exit(0);
        });
    });
}
startPrimordiaMaster();
