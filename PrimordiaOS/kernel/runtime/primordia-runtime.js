"use strict";
// kernel/runtime/primordia-runtime.ts
// Minimal PrimordiaOS runtime kernel for Fly.io deployment
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bus = exports.state = void 0;
exports.log = log;
exports.bootRuntime = bootRuntime;
const events_1 = require("events");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
exports.state = {
    bootTime: Date.now(),
    version: "1.0.0-minimal",
    status: "booting"
};
// ---- Event Bus ----
exports.bus = new events_1.EventEmitter();
// ---- Logger ----
function log(...msg) {
    console.log("[PrimordiaOS]", ...msg);
}
// ---- Runtime Boot ----
async function bootRuntime() {
    log("Booting PrimordiaOS minimal runtime…");
    // Load environment config if present
    const envPath = path_1.default.join(process.cwd(), ".env");
    if (fs_1.default.existsSync(envPath)) {
        log("Loading .env");
    }
    // Mark runtime ready
    exports.state.status = "ready";
    log("PrimordiaOS runtime ready.");
}
// ---- Export Runtime API ----
exports.default = {
    state: exports.state,
    bus: exports.bus,
    log,
    bootRuntime
};
