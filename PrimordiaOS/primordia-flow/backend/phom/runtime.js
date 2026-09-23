/**
 * ==============================================================================
 * ⭐ PHOM SERVER RUNTIME
 * Enterprise resilience & observability:
 * - Multi-agent Concurrency Manager (AgentConcurrencyPool)
 * - Pipeline Cancellation (AbortController registry)
 * - Pipeline Retry Logic (Exponential backoff)
 * - Trace Persistence (phom_pipeline_traces in SQLite)
 * - Unified Error Handler Middleware
 * ==============================================================================
 */
import { db } from '../db';
// ── 1. Trace Persistence in SQLite ──────────────────────────────────────────
export class PhomTraceManager {
    static inMemoryTraces = new Map();
    static init() {
        try {
            db.exec(`
        CREATE TABLE IF NOT EXISTS phom_pipeline_traces (
          trace_id TEXT PRIMARY KEY,
          boost_id TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          status TEXT NOT NULL,
          layers_json TEXT NOT NULL,
          total_duration_ms INTEGER NOT NULL,
          error TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_traces_boost ON phom_pipeline_traces(boost_id);
        CREATE INDEX IF NOT EXISTS idx_traces_time ON phom_pipeline_traces(timestamp DESC);
      `);
        }
        catch (e) {
            console.warn('[PhomTraceManager] Init notice:', e.message);
        }
    }
    static recordTrace(trace) {
        this.init();
        this.inMemoryTraces.set(trace.traceId, trace);
        try {
            db.prepare(`
        INSERT INTO phom_pipeline_traces (trace_id, boost_id, timestamp, status, layers_json, total_duration_ms, error)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(trace_id) DO UPDATE SET
          status = excluded.status,
          layers_json = excluded.layers_json,
          total_duration_ms = excluded.total_duration_ms,
          error = excluded.error
      `).run(trace.traceId, trace.boostId, trace.timestamp, trace.status, JSON.stringify(trace.layers), trace.totalDurationMs, trace.error || null);
        }
        catch (e) {
            console.warn('[PhomTraceManager] Save trace notice:', e.message);
        }
    }
    static getTrace(id) {
        this.init();
        if (this.inMemoryTraces.has(id)) {
            return this.inMemoryTraces.get(id);
        }
        try {
            const row = db.prepare(`
        SELECT * FROM phom_pipeline_traces WHERE trace_id = ? OR boost_id = ? LIMIT 1
      `).get(id, id);
            if (!row)
                return null;
            return {
                traceId: row.trace_id,
                boostId: row.boost_id,
                timestamp: row.timestamp,
                status: row.status,
                layers: JSON.parse(row.layers_json || '[]'),
                totalDurationMs: row.total_duration_ms,
                error: row.error || undefined
            };
        }
        catch {
            return null;
        }
    }
    static listTraces(limit = 30) {
        this.init();
        try {
            const rows = db.prepare(`
        SELECT * FROM phom_pipeline_traces ORDER BY timestamp DESC LIMIT ?
      `).all(limit);
            if (rows && rows.length > 0) {
                return rows.map(row => ({
                    traceId: row.trace_id,
                    boostId: row.boost_id,
                    timestamp: row.timestamp,
                    status: row.status,
                    layers: JSON.parse(row.layers_json || '[]'),
                    totalDurationMs: row.total_duration_ms,
                    error: row.error || undefined
                }));
            }
        }
        catch { }
        return Array.from(this.inMemoryTraces.values()).slice(-limit);
    }
}
// ── 2. Multi-Agent Concurrency Manager ──────────────────────────────────────
export class AgentConcurrencyPool {
    maxConcurrency;
    activeCount = 0;
    queue = [];
    constructor(maxConcurrency = 6) {
        this.maxConcurrency = maxConcurrency;
    }
    getStats() {
        return {
            maxConcurrency: this.maxConcurrency,
            activeCount: this.activeCount,
            queuedCount: this.queue.length
        };
    }
    async run(task) {
        if (this.activeCount >= this.maxConcurrency) {
            await new Promise(resolve => this.queue.push(resolve));
        }
        this.activeCount++;
        try {
            return await task();
        }
        finally {
            this.activeCount--;
            if (this.queue.length > 0) {
                const next = this.queue.shift();
                if (next)
                    next();
            }
        }
    }
}
export const defaultAgentPool = new AgentConcurrencyPool(8);
// ── 3. Pipeline Cancellation Manager ─────────────────────────────────────────
export class PipelineCancellationManager {
    static controllers = new Map();
    static registerPipeline(boostId) {
        const controller = new AbortController();
        this.controllers.set(boostId, controller);
        return controller.signal;
    }
    static cancelPipeline(boostId, reason = 'User requested cancellation') {
        const controller = this.controllers.get(boostId);
        if (controller) {
            controller.abort(new Error(reason));
            this.controllers.delete(boostId);
            // Update trace status in SQLite
            const trace = PhomTraceManager.getTrace(boostId);
            if (trace) {
                trace.status = 'cancelled';
                trace.error = reason;
                PhomTraceManager.recordTrace(trace);
            }
            return true;
        }
        return false;
    }
    static releasePipeline(boostId) {
        this.controllers.delete(boostId);
    }
    static isCancelled(boostId) {
        const controller = this.controllers.get(boostId);
        return !!controller?.signal.aborted;
    }
}
export async function withPipelineRetry(fn, options = {}) {
    const maxRetries = options.maxRetries ?? 3;
    let delay = options.backoffMs ?? 500;
    const exponential = options.exponential ?? true;
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err;
            if (attempt === maxRetries)
                break;
            await new Promise(r => setTimeout(r, delay));
            if (exponential)
                delay *= 2;
        }
    }
    throw lastError;
}
// ── 5. Unified Error Handler Middleware ─────────────────────────────────────
export function phomErrorHandler(err, req, res, next) {
    const statusCode = typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
    const errorCode = err.code || 'PHOM_INTERNAL_ERROR';
    const message = err.message || 'An unexpected error occurred in the PHOM engine.';
    console.error(`[PHOM Error] [${errorCode}] ${req.method} ${req.url}:`, message);
    if (res.headersSent) {
        return next(err);
    }
    res.status(statusCode).json({
        success: false,
        code: errorCode,
        error: message,
        timestamp: Math.floor(Date.now() / 1000),
        path: req.originalUrl || req.url,
        details: err.details || undefined
    });
}
