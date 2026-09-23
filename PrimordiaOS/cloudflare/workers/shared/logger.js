"use strict";
/**
 * Structured Telemetry & Logging Utility for PrimordiaOS Workers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    workerName;
    env;
    constructor(workerName, env) {
        this.workerName = workerName;
        this.env = env;
    }
    log(level, message, meta = {}) {
        const entry = {
            timestamp: new Date().toISOString(),
            worker: this.workerName,
            level,
            message,
            environment: this.env?.ENVIRONMENT || "dev",
            ...meta
        };
        console.log(JSON.stringify(entry));
        // Async stream log to D1 if database binding is present
        if (this.env?.PRIMORDIA_CORE_DB && (level === "warn" || level === "error")) {
            try {
                this.env.PRIMORDIA_CORE_DB.prepare("INSERT INTO system_logs (timestamp, worker, level, message, metadata) VALUES (?, ?, ?, ?, ?)").bind(entry.timestamp, entry.worker, entry.level, entry.message, JSON.stringify(meta)).run();
            }
            catch (err) {
                console.error("Failed to write log to D1:", err);
            }
        }
    }
    debug(msg, meta) { this.log("debug", msg, meta); }
    info(msg, meta) { this.log("info", msg, meta); }
    warn(msg, meta) { this.log("warn", msg, meta); }
    error(msg, meta) { this.log("error", msg, meta); }
}
exports.Logger = Logger;
