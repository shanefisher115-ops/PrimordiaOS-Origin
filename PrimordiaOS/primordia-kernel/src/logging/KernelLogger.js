/**
 * PrimordiaOS Sovereign Kernel Subsystem
 * KernelLogger.ts - High-performance structured JSON logging engine
 */
const LOG_LEVEL_SEVERITY = {
    TRACE: 10,
    DEBUG: 20,
    INFO: 30,
    WARN: 40,
    ERROR: 50,
    FATAL: 60,
};
export class KernelLogger {
    minLevel;
    enableConsole;
    bufferCapacity;
    subsystem;
    buffer = [];
    constructor(options = {}) {
        this.minLevel = options.minLevel || process.env.LOG_LEVEL || 'INFO';
        this.enableConsole = options.enableConsole ?? true;
        this.bufferCapacity = options.bufferCapacity ?? 1000;
        this.subsystem = options.subsystem ?? 'kernel';
    }
    forSubsystem(subsystem) {
        const child = new KernelLogger({
            minLevel: this.minLevel,
            enableConsole: this.enableConsole,
            bufferCapacity: this.bufferCapacity,
            subsystem,
        });
        // Link buffer reference to parent so all child loggers share the same queryable buffer
        child.buffer = this.buffer;
        return child;
    }
    trace(message, metadata, traceId) {
        this.log('TRACE', message, metadata, undefined, traceId);
    }
    debug(message, metadata, traceId) {
        this.log('DEBUG', message, metadata, undefined, traceId);
    }
    info(message, metadata, traceId) {
        this.log('INFO', message, metadata, undefined, traceId);
    }
    warn(message, metadata, traceId) {
        this.log('WARN', message, metadata, undefined, traceId);
    }
    error(message, error, metadata, traceId) {
        let errObj;
        if (error instanceof Error) {
            errObj = {
                name: error.name,
                message: error.message,
                stack: error.stack,
            };
        }
        else if (error) {
            errObj = {
                name: 'UnknownError',
                message: String(error),
            };
        }
        this.log('ERROR', message, metadata, errObj, traceId);
    }
    fatal(message, error, metadata, traceId) {
        let errObj;
        if (error instanceof Error) {
            errObj = {
                name: error.name,
                message: error.message,
                stack: error.stack,
            };
        }
        else if (error) {
            errObj = {
                name: 'FatalKernelError',
                message: String(error),
            };
        }
        this.log('FATAL', message, metadata, errObj, traceId);
    }
    // Specialized logging domains
    logBoot(phase, status, details) {
        this.info(`[BOOT] Phase: ${phase} -> ${status}`, { phase, status, ...details });
    }
    logEvent(topic, eventId, source, details) {
        this.debug(`[EVENT] Topic: ${topic} from ${source}`, { topic, eventId, source, ...details });
    }
    logIPC(channel, sourceRealm, targetRealm, action, traceId) {
        this.debug(`[IPC] ${sourceRealm} -> ${targetRealm} [${channel}:${action}]`, {
            channel,
            sourceRealm,
            targetRealm,
            action,
        }, traceId);
    }
    logTask(taskId, name, status, details) {
        this.debug(`[TASK] ${name} (${taskId}) -> ${status}`, { taskId, name, status, ...details });
    }
    logSafety(rule, severity, details) {
        const level = severity === 'CRITICAL' ? 'ERROR' : severity === 'MEDIUM' ? 'WARN' : 'INFO';
        this.log(level, `[SAFETY] Rule violated: ${rule} (${severity})`, { rule, severity, ...details });
    }
    log(level, message, metadata, error, traceId) {
        if (LOG_LEVEL_SEVERITY[level] < LOG_LEVEL_SEVERITY[this.minLevel]) {
            return;
        }
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            subsystem: this.subsystem,
            message,
            ...(traceId ? { traceId } : {}),
            ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
            ...(error ? { error } : {}),
        };
        // Store in ring buffer
        this.buffer.push(entry);
        if (this.buffer.length > this.bufferCapacity) {
            this.buffer.shift();
        }
        if (this.enableConsole) {
            const serialized = JSON.stringify(entry);
            if (level === 'ERROR' || level === 'FATAL') {
                console.error(serialized);
            }
            else if (level === 'WARN') {
                console.warn(serialized);
            }
            else {
                console.log(serialized);
            }
        }
    }
    getRecentLogs(limit = 100, filterSubsystem, minLevel) {
        let filtered = this.buffer;
        if (filterSubsystem) {
            filtered = filtered.filter(entry => entry.subsystem === filterSubsystem);
        }
        if (minLevel) {
            const minSev = LOG_LEVEL_SEVERITY[minLevel];
            filtered = filtered.filter(entry => LOG_LEVEL_SEVERITY[entry.level] >= minSev);
        }
        return filtered.slice(-limit);
    }
    clearBuffer() {
        this.buffer.length = 0;
    }
}
