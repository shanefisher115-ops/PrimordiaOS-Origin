/**
 * PrimordiaOS Sovereign Cockpit — Structured Logging Subsystem
 * Implements high-throughput JSON logging, in-memory ring buffers,
 * trace correlation, and error quarantine boundaries.
 */
export class CockpitLogger {
    static instance = null;
    ringBuffer = [];
    maxBufferSize = 2000;
    listeners = new Set();
    minLevel = 'DEBUG';
    static LEVEL_PRIORITY = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        PANIC: 4,
    };
    constructor(maxBufferSize = 2000) {
        this.maxBufferSize = maxBufferSize;
        const envLevel = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
        if (envLevel in CockpitLogger.LEVEL_PRIORITY) {
            this.minLevel = envLevel;
        }
    }
    static getInstance() {
        if (!CockpitLogger.instance) {
            CockpitLogger.instance = new CockpitLogger();
        }
        return CockpitLogger.instance;
    }
    setMinLevel(level) {
        this.minLevel = level;
    }
    debug(subsystem, message, metadata, traceId) {
        this.log('DEBUG', subsystem, message, metadata, undefined, traceId);
    }
    info(subsystem, message, metadata, traceId) {
        this.log('INFO', subsystem, message, metadata, undefined, traceId);
    }
    warn(subsystem, message, metadata, traceId) {
        this.log('WARN', subsystem, message, metadata, undefined, traceId);
    }
    error(subsystem, message, error, metadata, traceId) {
        const errorObj = error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
        } : error ? {
            name: 'UnknownError',
            message: String(error)
        } : undefined;
        this.log('ERROR', subsystem, message, metadata, errorObj, traceId);
    }
    panic(subsystem, message, error, metadata, traceId) {
        const errorObj = error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
        } : error ? {
            name: 'PanicError',
            message: String(error)
        } : undefined;
        this.log('PANIC', subsystem, message, metadata, errorObj, traceId);
    }
    /**
     * Quarantines dangerous subsystem execution, preventing engine crashes.
     */
    quarantine(subsystem, operation, fallback) {
        try {
            return operation();
        }
        catch (err) {
            this.error(subsystem, `Quarantined subsystem failure intercepted: ${err instanceof Error ? err.message : String(err)}`, err);
            return fallback;
        }
    }
    /**
     * Async variant of quarantine boundary.
     */
    async quarantineAsync(subsystem, operation, fallback) {
        try {
            return await operation();
        }
        catch (err) {
            this.error(subsystem, `Quarantined async subsystem failure intercepted: ${err instanceof Error ? err.message : String(err)}`, err);
            return fallback;
        }
    }
    getRecentLogs(count = 100, levelFilter) {
        let logs = this.ringBuffer;
        if (levelFilter) {
            const minPriority = CockpitLogger.LEVEL_PRIORITY[levelFilter];
            logs = logs.filter(l => CockpitLogger.LEVEL_PRIORITY[l.level] >= minPriority);
        }
        return logs.slice(-count);
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    log(level, subsystem, message, metadata, error, traceId) {
        if (CockpitLogger.LEVEL_PRIORITY[level] < CockpitLogger.LEVEL_PRIORITY[this.minLevel]) {
            return;
        }
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            subsystem,
            message,
            traceId: traceId || this.generateTraceId(),
            metadata,
            error
        };
        // Maintain circular ring buffer
        if (this.ringBuffer.length >= this.maxBufferSize) {
            this.ringBuffer.shift();
        }
        this.ringBuffer.push(entry);
        // Output JSON to standard output or standard error
        const jsonOutput = JSON.stringify(entry);
        if (level === 'ERROR' || level === 'PANIC') {
            process.stderr.write(jsonOutput + '\n');
        }
        else {
            process.stdout.write(jsonOutput + '\n');
        }
        // Notify registered live listeners (e.g., WebSocket broadcast)
        for (const listener of this.listeners) {
            try {
                listener(entry);
            }
            catch (listenerError) {
                process.stderr.write(`[CockpitLogger] Listener error: ${listenerError}\n`);
            }
        }
    }
    generateTraceId() {
        return 'trace-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
    }
}
export const logger = CockpitLogger.getInstance();
