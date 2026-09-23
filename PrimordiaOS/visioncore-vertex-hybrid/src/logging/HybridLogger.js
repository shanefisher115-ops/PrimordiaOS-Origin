/**
 * HybridLogger - Structured JSON Logging & Error Quarantine Subsystem
 * Agent Role: Safety & Logging Specialist
 * PrimordiaOS VisionCore x Vertex AI Substrate
 */
export class HybridLogger {
    component;
    static logHistory = [];
    static quarantineLedger = new Map();
    static maxHistory = 2000;
    constructor(component = 'HybridSubsystem') {
        this.component = component;
    }
    forComponent(childComponent) {
        return new HybridLogger(`${this.component}::${childComponent}`);
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
        HybridLogger.logHistory.push(entry);
        if (HybridLogger.logHistory.length > HybridLogger.maxHistory) {
            HybridLogger.logHistory.shift();
        }
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
    error(message, err, metadata, traceId) {
        const meta = {
            ...metadata,
            error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err
        };
        return this.writeLog('ERROR', message, meta, traceId);
    }
    audit(message, metadata, traceId) {
        return this.writeLog('AUDIT', message, metadata, traceId);
    }
    /**
     * Isolates a critical execution failure into the quarantine ledger,
     * preventing cascading unhandled rejections while preserving full forensic context.
     */
    quarantine(err, payloadContext, severity = 'HIGH', traceId) {
        const id = `qerr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
        const errorMessage = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
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
        HybridLogger.quarantineLedger.set(id, quarantined);
        this.writeLog('ERROR', `[QUARANTINE_ISOLATION] Failure quarantined [ID: ${id}]`, {
            quarantineId: id,
            severity,
            errorMessage,
            hasPayloadContext: payloadContext !== undefined
        }, traceId);
        return quarantined;
    }
    static getHistory(componentFilter, levelFilter) {
        return HybridLogger.logHistory.filter(item => {
            if (componentFilter && !item.component.includes(componentFilter))
                return false;
            if (levelFilter && item.level !== levelFilter)
                return false;
            return true;
        });
    }
    static getQuarantinedErrors() {
        return Array.from(HybridLogger.quarantineLedger.values());
    }
    static resolveQuarantinedError(id) {
        const err = HybridLogger.quarantineLedger.get(id);
        if (err) {
            err.resolved = true;
            return true;
        }
        return false;
    }
    static clearHistory() {
        HybridLogger.logHistory = [];
        HybridLogger.quarantineLedger.clear();
    }
}
