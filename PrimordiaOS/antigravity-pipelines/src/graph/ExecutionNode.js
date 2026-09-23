export class ExecutionNode {
    id;
    name;
    agentTarget;
    action;
    params;
    maxRetries;
    timeoutMs;
    fallbackTarget;
    critical;
    status = 'PENDING';
    retriesAttempted = 0;
    startedAt;
    completedAt;
    input = {};
    output;
    error;
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.agentTarget = config.agentTarget;
        this.action = config.action;
        this.params = config.params ? { ...config.params } : {};
        this.maxRetries = config.maxRetries ?? 2;
        this.timeoutMs = config.timeoutMs ?? 30000;
        this.fallbackTarget = config.fallbackTarget;
        this.critical = config.critical ?? true;
    }
    getStatus() {
        return this.status;
    }
    setStatus(status) {
        this.status = status;
    }
    getRetriesAttempted() {
        return this.retriesAttempted;
    }
    incrementRetries() {
        this.retriesAttempted += 1;
        return this.retriesAttempted;
    }
    canRetry() {
        return this.retriesAttempted < this.maxRetries;
    }
    start(input) {
        this.status = 'RUNNING';
        this.startedAt = Date.now();
        this.input = { ...this.params, ...input };
    }
    complete(output) {
        this.status = 'COMPLETED';
        this.completedAt = Date.now();
        this.output = output;
    }
    fail(error) {
        this.status = 'FAILED';
        this.completedAt = Date.now();
        this.error = error;
    }
    skip(reason) {
        this.status = 'SKIPPED';
        this.completedAt = Date.now();
        this.output = { skipped: true, reason: reason ?? 'Condition unfulfilled' };
    }
    quarantine(reason) {
        this.status = 'QUARANTINED';
        this.completedAt = Date.now();
        this.error = `Quarantined by Safety Layer: ${reason}`;
    }
    getInput() {
        return { ...this.input };
    }
    getOutput() {
        return this.output ? { ...this.output } : undefined;
    }
    getError() {
        return this.error;
    }
    getDurationMs() {
        if (!this.startedAt)
            return 0;
        const end = this.completedAt ?? Date.now();
        return Math.max(0, end - this.startedAt);
    }
    getTrace() {
        return {
            nodeId: this.id,
            name: this.name,
            agentTarget: this.agentTarget,
            status: this.status,
            startedAt: this.startedAt,
            completedAt: this.completedAt,
            durationMs: this.getDurationMs(),
            retriesAttempted: this.retriesAttempted,
            input: this.getInput(),
            output: this.getOutput(),
            error: this.error,
        };
    }
    reset() {
        this.status = 'PENDING';
        this.retriesAttempted = 0;
        this.startedAt = undefined;
        this.completedAt = undefined;
        this.input = {};
        this.output = undefined;
        this.error = undefined;
    }
}
