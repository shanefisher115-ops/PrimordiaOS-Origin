/**
 * @file MemoryLogger.ts
 * @description Structured JSON logging engine for PrimordiaOS Spatial Memory Subsystem.
 * Provides high-altitude telemetry, in-memory circular buffers, and stream persistence.
 */
const LEVEL_PRIORITY = {
    DEBUG: 10,
    INFO: 20,
    WARN: 30,
    ERROR: 40,
    FATAL: 50,
};
export class MemoryLogger {
    component;
    minLevel;
    enableStdout;
    bufferCapacity;
    static ringBuffer = [];
    static maxGlobalBufferSize = 2000;
    constructor(options) {
        this.component = options.component;
        this.minLevel = options.minLevel ?? process.env['LOG_LEVEL'] ?? 'INFO';
        this.enableStdout = options.enableStdout ?? true;
        this.bufferCapacity = options.bufferCapacity ?? 500;
    }
    setLevel(level) {
        this.minLevel = level;
    }
    getLevel() {
        return this.minLevel;
    }
    debug(message, context, correlationId) {
        this.log('DEBUG', message, context, correlationId);
    }
    info(message, context, correlationId) {
        this.log('INFO', message, context, correlationId);
    }
    warn(message, context, correlationId) {
        this.log('WARN', message, context, correlationId);
    }
    error(message, error, context, correlationId) {
        const errorDetails = error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : error
                ? { name: 'UnknownError', message: String(error) }
                : undefined;
        this.log('ERROR', message, context, correlationId, errorDetails);
    }
    fatal(message, error, context, correlationId) {
        const errorDetails = error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : error
                ? { name: 'FatalError', message: String(error) }
                : undefined;
        this.log('FATAL', message, context, correlationId, errorDetails);
    }
    log(level, message, context, correlationId, error) {
        if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.minLevel]) {
            return;
        }
        const entry = {
            timestamp: new Date().toISOString(),
            epochMs: Date.now(),
            level,
            component: this.component,
            message,
            ...(context && Object.keys(context).length > 0 ? { context } : {}),
            ...(correlationId ? { correlationId } : {}),
            ...(error ? { error } : {}),
        };
        // Store in global circular buffer
        MemoryLogger.ringBuffer.push(entry);
        if (MemoryLogger.ringBuffer.length > MemoryLogger.maxGlobalBufferSize) {
            MemoryLogger.ringBuffer.shift();
        }
        if (this.enableStdout) {
            const jsonStr = JSON.stringify(entry);
            if (level === 'ERROR' || level === 'FATAL') {
                process.stderr.write(`${jsonStr}\n`);
            }
            else {
                process.stdout.write(`${jsonStr}\n`);
            }
        }
    }
    getRecentLogs(limit = 100, level) {
        let filtered = MemoryLogger.ringBuffer;
        if (level) {
            const targetPriority = LEVEL_PRIORITY[level];
            filtered = filtered.filter(e => LEVEL_PRIORITY[e.level] >= targetPriority);
        }
        return filtered.slice(-Math.min(limit, filtered.length));
    }
    static clearLogs() {
        MemoryLogger.ringBuffer = [];
    }
}
