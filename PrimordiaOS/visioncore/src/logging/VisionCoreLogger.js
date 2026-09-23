/**
 * VisionCoreLogger - Structured JSON Logging & Error Quarantine Subsystem
 * Agent Role: Safety & Logging Specialist
 */
export class VisionCoreLogger {
    component;
    static logHistory = [];
    static quarantineLedger = new Map();
    static maxHistory = 1000;
    constructor(component = 'VisionCore') {
        this.component = component;
    }
    forComponent(childComponent) {
        return new VisionCoreLogger(`${this.component}::${childComponent}`);
    }
    writeLog(level, message, metadata, traceId, durationMs) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            component: this.component,
            traceId: traceId || `trace-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
            message,
            metadata,
            durationMs
        };
        VisionCoreLogger.logHistory.push(entry);
        if (VisionCoreLogger.logHistory.length > VisionCoreLogger.maxHistory) {
            VisionCoreLogger.logHistory.shift();
        }
        // Output formatted JSON log to stdout/stderr
        const serialized = JSON.stringify(entry);
        if (level === 'ERROR') {
            console.error(serialized);
        }
        else if (level === 'WARN') {
            console.warn(serialized);
        }
        else {
            console.log(serialized);
        }
        return entry;
    }
    debug(message, metadata, traceId) {
        return this.writeLog('DEBUG', message, metadata, traceId);
    }
    info(message, metadata, traceId) {
        return this.writeLog('INFO', message, metadata, traceId);
    }
    warn(message, metadata, traceId) {
        return this.writeLog('WARN', message, metadata, traceId);
    }
    error(message, error, metadata, traceId) {
        const meta = {
            ...metadata,
            error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error
        };
        return this.writeLog('ERROR', message, meta, traceId);
    }
    audit(message, metadata, traceId) {
        return this.writeLog('AUDIT', message, metadata, traceId);
    }
    quarantine(error, payloadContext, severity = 'HIGH', traceId) {
        const id = `qerr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        const quarantined = {
            id,
            timestamp: new Date().toISOString(),
            component: this.component,
            traceId: traceId || `trace-${Date.now().toString(36)}`,
            errorMessage,
            stack,
            payloadContext,
            severity,
            resolved: false
        };
        VisionCoreLogger.quarantineLedger.set(id, quarantined);
        this.writeLog('ERROR', `[QUARANTINE ACTIVATED] Error isolated under ID: ${id}`, {
            quarantineId: id,
            severity,
            errorMessage
        }, traceId);
        return quarantined;
    }
    static getHistory(componentFilter, levelFilter) {
        return VisionCoreLogger.logHistory.filter(item => {
            if (componentFilter && !item.component.includes(componentFilter))
                return false;
            if (levelFilter && item.level !== levelFilter)
                return false;
            return true;
        });
    }
    static getQuarantinedErrors() {
        return Array.from(VisionCoreLogger.quarantineLedger.values());
    }
    static resolveQuarantinedError(id) {
        const err = VisionCoreLogger.quarantineLedger.get(id);
        if (err) {
            err.resolved = true;
            return true;
        }
        return false;
    }
    static clearHistory() {
        VisionCoreLogger.logHistory = [];
        VisionCoreLogger.quarantineLedger.clear();
    }
}
