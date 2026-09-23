/**
 * PrimordiaOS Sovereign Kernel Subsystem
 * IPCRouter.ts - High-throughput inter-realm message router, RPC invocations, and streaming IPC
 */
export class IPCRouter {
    logger;
    safety;
    registry;
    // Key: `${realmId}:${channel}:${action}` or `${realmId}:${channel}:*`
    handlers = new Map();
    // Key: streamId
    streamListeners = new Map();
    constructor(logger, safety, registry) {
        this.logger = logger.forSubsystem('ipc');
        this.safety = safety;
        this.registry = registry;
    }
    handlerKey(realmId, channel, action) {
        return `${realmId}:${channel}:${action}`;
    }
    /**
     * Registers a message or RPC handler for a specific realm, channel, and action
     */
    registerHandler(realmId, channel, action, handler) {
        const key = this.handlerKey(realmId, channel, action);
        this.handlers.set(key, handler);
        this.logger.debug(`Registered IPC handler for [${key}]`);
    }
    unregisterHandler(realmId, channel, action) {
        const key = this.handlerKey(realmId, channel, action);
        return this.handlers.delete(key);
    }
    /**
     * Normalizes raw IPC message arguments into an authenticated IPCEnvelope
     */
    createEnvelope(params) {
        return {
            id: `ipc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            sourceRealm: params.sourceRealm,
            targetRealm: params.targetRealm,
            channel: params.channel,
            action: params.action,
            payload: params.payload,
            timestamp: new Date().toISOString(),
            traceId: params.traceId || `trace-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            isStream: params.isStream ?? false,
            chunkIndex: params.chunkIndex,
            isFinalChunk: params.isFinalChunk,
            timeoutMs: params.timeoutMs,
        };
    }
    /**
     * Performs an asynchronous request-response RPC between realms
     */
    async invoke(envelope) {
        // 1. Safety validation
        const check = this.safety.validateIPCEnvelope(envelope);
        if (!check.allowed) {
            this.logger.warn(`IPC invocation rejected: ${check.reason}`);
            return {
                correlationId: envelope.id,
                success: false,
                error: check.reason,
                timestamp: new Date().toISOString(),
            };
        }
        // 2. Validate target realm existence and health
        if (envelope.targetRealm !== '*' && !this.registry.hasRealm(envelope.targetRealm)) {
            const err = `Target realm not registered: ${envelope.targetRealm}`;
            this.logger.error(err);
            return {
                correlationId: envelope.id,
                success: false,
                error: err,
                timestamp: new Date().toISOString(),
            };
        }
        this.logger.logIPC(envelope.channel, envelope.sourceRealm, envelope.targetRealm, envelope.action, envelope.traceId);
        // 3. Resolve handler
        const key = this.handlerKey(envelope.targetRealm, envelope.channel, envelope.action);
        const wildcardKey = this.handlerKey(envelope.targetRealm, envelope.channel, '*');
        const handler = this.handlers.get(key) || this.handlers.get(wildcardKey);
        if (!handler) {
            const err = `No IPC handler registered for [${envelope.targetRealm}:${envelope.channel}:${envelope.action}]`;
            this.logger.warn(err);
            return {
                correlationId: envelope.id,
                success: false,
                error: err,
                timestamp: new Date().toISOString(),
            };
        }
        // 4. Execute with timeout
        const timeoutLimit = envelope.timeoutMs || this.safety.getTaskExecutionTimeout();
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`IPC invocation timed out after ${timeoutLimit}ms`)), timeoutLimit);
            });
            const execPromise = Promise.resolve(handler(envelope));
            const result = (await Promise.race([execPromise, timeoutPromise]));
            return {
                correlationId: envelope.id,
                success: true,
                payload: result,
                timestamp: new Date().toISOString(),
            };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`IPC Execution error [${key}]: ${msg}`);
            return {
                correlationId: envelope.id,
                success: false,
                error: msg,
                timestamp: new Date().toISOString(),
            };
        }
    }
    /**
     * Broadcasts an IPC message to all realms matching a channel
     */
    async broadcast(sourceRealm, channel, action, payload) {
        const realms = this.registry.listRealms().filter(r => r.id !== sourceRealm);
        const results = [];
        for (const realm of realms) {
            const envelope = this.createEnvelope({
                sourceRealm,
                targetRealm: realm.id,
                channel,
                action,
                payload,
            });
            const response = await this.invoke(envelope);
            results.push(response);
        }
        return results;
    }
    /**
     * Streaming IPC: sends a sequence of chunks and notifies listeners
     */
    async sendStreamChunk(envelope) {
        const check = this.safety.validateIPCEnvelope(envelope);
        if (!check.allowed)
            return false;
        const streamId = envelope.traceId;
        const listeners = this.streamListeners.get(streamId) || [];
        for (const listener of listeners) {
            try {
                await listener(envelope);
            }
            catch (err) {
                this.logger.error(`Error in stream listener for stream ${streamId}`, err);
            }
        }
        if (envelope.isFinalChunk) {
            this.streamListeners.delete(streamId);
            this.logger.debug(`Closed IPC stream [${streamId}]`);
        }
        return true;
    }
    subscribeStream(streamId, listener) {
        const current = this.streamListeners.get(streamId) || [];
        current.push(listener);
        this.streamListeners.set(streamId, current);
    }
}
