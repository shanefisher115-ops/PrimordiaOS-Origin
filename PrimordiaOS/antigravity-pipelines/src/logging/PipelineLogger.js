export class PipelineLogger {
    static instance = null;
    minLevel = 'INFO';
    logBuffer = [];
    maxBufferSize = 2000;
    levelWeights = {
        DEBUG: 10,
        INFO: 20,
        WARN: 30,
        ERROR: 40,
        FATAL: 50,
    };
    constructor(minLevel = 'INFO') {
        this.minLevel = minLevel;
    }
    static getInstance() {
        if (!PipelineLogger.instance) {
            PipelineLogger.instance = new PipelineLogger(process.env['LOG_LEVEL'] || 'INFO');
        }
        return PipelineLogger.instance;
    }
    setLevel(level) {
        this.minLevel = level;
    }
    shouldLog(level) {
        return this.levelWeights[level] >= this.levelWeights[this.minLevel];
    }
    write(entry) {
        if (!this.shouldLog(entry.level)) {
            return;
        }
        this.logBuffer.push(entry);
        if (this.logBuffer.length > this.maxBufferSize) {
            this.logBuffer.shift();
        }
        const serialized = JSON.stringify(entry);
        if (entry.level === 'ERROR' || entry.level === 'FATAL') {
            process.stderr.write(serialized + '\n');
        }
        else {
            process.stdout.write(serialized + '\n');
        }
    }
    log(level, subsystem, message, context) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            subsystem,
            message,
            pipelineId: context?.pipelineId,
            runId: context?.runId,
            nodeId: context?.nodeId,
            traceId: context?.traceId,
            data: context?.data,
            error: context?.error,
        };
        this.write(entry);
    }
    debug(subsystem, message, data, context) {
        this.log('DEBUG', subsystem, message, { data, ...context });
    }
    info(subsystem, message, data, context) {
        this.log('INFO', subsystem, message, { data, ...context });
    }
    warn(subsystem, message, data, context) {
        this.log('WARN', subsystem, message, { data, ...context });
    }
    error(subsystem, message, err, context) {
        const errorDetails = err instanceof Error
            ? { message: err.message, stack: err.stack, code: err.code }
            : err ? { message: String(err) } : undefined;
        this.log('ERROR', subsystem, message, {
            ...context,
            error: errorDetails,
        });
    }
    fatal(subsystem, message, err, context) {
        const errorDetails = err instanceof Error
            ? { message: err.message, stack: err.stack, code: err.code }
            : err ? { message: String(err) } : undefined;
        this.log('FATAL', subsystem, message, {
            ...context,
            error: errorDetails,
        });
    }
    bootLog(phase, message, data) {
        this.log('INFO', 'PipelineBoot', `[BOOT:${phase}] ${message}`, { data });
    }
    executionLog(pipelineId, runId, status, details) {
        this.log('INFO', 'PipelineExecution', `Pipeline ${pipelineId} [${runId}] -> ${status}`, {
            pipelineId,
            runId,
            data: details,
        });
    }
    routingLog(taskId, target, action, traceId) {
        this.log('DEBUG', 'MultiAgentRouter', `Routed task ${taskId} (${action}) -> ${target}`, {
            traceId,
            data: { taskId, target, action },
        });
    }
    safetyLog(violation, reason, context) {
        this.log('WARN', 'PipelineSafetyLayer', `[SAFETY_VIOLATION] ${violation}: ${reason}`, {
            pipelineId: context?.pipelineId,
            nodeId: context?.nodeId,
            data: { violation, reason },
        });
    }
    getRecentLogs(limit = 100) {
        return this.logBuffer.slice(-limit);
    }
    clearBuffer() {
        this.logBuffer = [];
    }
}
