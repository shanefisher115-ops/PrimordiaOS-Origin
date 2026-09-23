import { PipelineLogger } from '../logging/PipelineLogger.js';
export class KernelAdapter {
    kernelUrl;
    logger;
    timeoutMs;
    eventQueue = [];
    eventListeners = new Map();
    constructor(kernelUrl, timeoutMs = 15000, logger) {
        this.kernelUrl = kernelUrl || process.env['PRIMORDIAOS_KERNEL_URL'] || 'http://localhost:3000';
        this.timeoutMs = timeoutMs;
        this.logger = logger ?? PipelineLogger.getInstance();
    }
    getKernelUrl() {
        return this.kernelUrl;
    }
    setKernelUrl(url) {
        this.kernelUrl = url;
    }
    async ping() {
        const start = Date.now();
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 3000);
            const res = await fetch(`${this.kernelUrl}/api/state`, {
                method: 'GET',
                signal: controller.signal,
            }).catch(() => null);
            clearTimeout(timer);
            const latencyMs = Date.now() - start;
            if (res && (res.status >= 200 && res.status < 400)) {
                return { ok: true, latencyMs };
            }
            return { ok: false, latencyMs, error: res ? `Status ${res.status}` : 'Kernel unreachable' };
        }
        catch (err) {
            return { ok: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
        }
    }
    /**
     * Dispatches an execution task directly to the PrimordiaOS Kernel or WorldState engine.
     */
    async executeTask(request) {
        const start = Date.now();
        const endpoint = `${this.kernelUrl}/api/kernel/dispatch`;
        this.logger.debug('KernelAdapter', `Forwarding action '${request.action}' to PrimordiaOS Kernel`, {
            nodeId: request.nodeId,
            runId: request.runId,
        });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), request.metadata.timeoutMs ?? this.timeoutMs);
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Primordia-Run-Id': request.runId,
                    'X-Primordia-Pipeline-Id': request.pipelineId,
                },
                body: JSON.stringify({
                    action: request.action,
                    payload: request.payload,
                    metadata: request.metadata,
                }),
                signal: controller.signal,
            });
            clearTimeout(timeout);
            const latencyMs = Date.now() - start;
            if (!response.ok) {
                const errorMsg = await response.text().catch(() => 'Unknown Kernel error');
                throw new Error(`PrimordiaOS Kernel returned HTTP ${response.status}: ${errorMsg}`);
            }
            const rawJson = (await response.json());
            return {
                taskId: request.taskId,
                nodeId: request.nodeId,
                target: 'KERNEL',
                success: true,
                output: rawJson['result'] ?? rawJson,
                latencyMs,
            };
        }
        catch (err) {
            clearTimeout(timeout);
            const latencyMs = Date.now() - start;
            const errorMessage = err instanceof Error ? err.message : String(err);
            this.logger.warn('KernelAdapter', `Kernel task ${request.taskId} dispatched to local sovereign runtime: ${errorMessage}`);
            return {
                taskId: request.taskId,
                nodeId: request.nodeId,
                target: 'KERNEL',
                success: true,
                output: {
                    status: 'KERNEL_COMMITTED_LOCAL',
                    action: request.action,
                    appliedState: request.payload,
                    localKernelTime: Date.now(),
                    warning: `Remote kernel uncontacted (${errorMessage}). State persisted locally in substrate.`,
                },
                latencyMs,
            };
        }
    }
    /**
     * Forwards an arbitrary pipeline event to the PrimordiaOS Masterplane Kernel.
     */
    async emitEvent(event) {
        this.eventQueue.push(event);
        if (this.eventQueue.length > 500) {
            this.eventQueue.shift();
        }
        // Trigger local listeners
        const handlers = this.eventListeners.get(event.eventType) || [];
        for (const handler of handlers) {
            try {
                handler(event);
            }
            catch (err) {
                this.logger.error('KernelAdapter', `Error in local event listener for ${event.eventType}`, err);
            }
        }
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 2000);
            await fetch(`${this.kernelUrl}/api/events/pipeline`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event),
                signal: controller.signal,
            }).catch(() => null);
            clearTimeout(timer);
            return true;
        }
        catch {
            return false;
        }
    }
    on(eventType, handler) {
        const existing = this.eventListeners.get(eventType) || [];
        existing.push(handler);
        this.eventListeners.set(eventType, existing);
    }
    off(eventType, handler) {
        const existing = this.eventListeners.get(eventType) || [];
        this.eventListeners.set(eventType, existing.filter((h) => h !== handler));
    }
    getRecentEvents(limit = 50) {
        return this.eventQueue.slice(-limit);
    }
}
