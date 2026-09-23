export class SigilForgeLogger {
    static instance = null;
    subsystem;
    minLevel = 'INFO';
    listeners = new Set();
    levelWeights = {
        DEBUG: 10,
        INFO: 20,
        WARN: 30,
        ERROR: 40,
        SOVEREIGN: 50,
    };
    constructor(subsystem = 'SigilForge') {
        this.subsystem = subsystem;
    }
    static getInstance(subsystem = 'SigilForge') {
        if (!SigilForgeLogger.instance) {
            SigilForgeLogger.instance = new SigilForgeLogger(subsystem);
        }
        return SigilForgeLogger.instance;
    }
    setMinLevel(level) {
        this.minLevel = level;
    }
    addTelemetryListener(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    debug(message, data) {
        this.emit('DEBUG', message, data);
    }
    info(message, data) {
        this.emit('INFO', message, data);
    }
    warn(message, data) {
        this.emit('WARN', message, data);
    }
    error(message, err, data) {
        let errorObj;
        if (err instanceof Error) {
            errorObj = { message: err.message, stack: err.stack };
        }
        else if (err !== undefined) {
            errorObj = { message: String(err) };
        }
        this.emit('ERROR', message, data, errorObj);
    }
    sovereign(message, data) {
        this.emit('SOVEREIGN', message, data);
    }
    emit(level, message, data, error) {
        if (this.levelWeights[level] < this.levelWeights[this.minLevel]) {
            return;
        }
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            subsystem: this.subsystem,
            message,
            ...(data ? { data } : {}),
            ...(error ? { error } : {}),
        };
        const jsonString = JSON.stringify(entry);
        switch (level) {
            case 'DEBUG':
                console.debug(jsonString);
                break;
            case 'INFO':
                console.info(jsonString);
                break;
            case 'WARN':
                console.warn(jsonString);
                break;
            case 'ERROR':
                console.error(jsonString);
                break;
            case 'SOVEREIGN':
                console.log(`\x1b[35m[SOVEREIGN]\x1b[0m ${jsonString}`);
                break;
        }
        for (const listener of this.listeners) {
            try {
                listener(entry);
            }
            catch (listenerErr) {
                console.error('Failed to notify telemetry listener:', listenerErr);
            }
        }
    }
}
