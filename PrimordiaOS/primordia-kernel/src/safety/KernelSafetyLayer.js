/**
 * PrimordiaOS Sovereign Kernel Subsystem
 * KernelSafetyLayer.ts - Sovereign execution security and threat quarantine engine
 */
export class KernelSafetyLayer {
    logger;
    config;
    quarantineLedger = [];
    eventRateTracker = new Map();
    ipcRateTracker = new Map();
    constructor(logger, config = {}) {
        this.logger = logger.forSubsystem('safety');
        this.config = {
            primordiaKey: config.primordiaKey ?? process.env.PRIMORDIAOS_KEY ?? '',
            maxPayloadBytes: config.maxPayloadBytes ?? 10 * 1024 * 1024, // 10MB default
            maxTaskExecutionMs: config.maxTaskExecutionMs ?? 30000, // 30s runaway ceiling
            maxEventsPerSecond: config.maxEventsPerSecond ?? 500,
            maxIpcPerSecond: config.maxIpcPerSecond ?? 200,
        };
    }
    /**
     * Validates Primordia sovereign license key format and tier
     */
    verifyLicenseKey(candidateKey) {
        const key = candidateKey || this.config.primordiaKey;
        if (!key) {
            this.logger.warn('No PRIMORDIAOS_KEY detected. Running in restricted COMMUNITY_DEV mode.');
            return {
                valid: true,
                tier: 'COMMUNITY_DEV',
                message: 'Default sovereign developer license active.',
            };
        }
        // Sovereign key format: PRIM-[TIER]-[ENTROPY]-[SIG] or standard HMAC key
        const parts = key.split('-');
        if (parts.length >= 4 && parts[0] === 'PRIM') {
            const tierCode = parts[1]?.toUpperCase();
            if (tierCode === 'ENT' || tierCode === 'SOVEREIGN') {
                return { valid: true, tier: 'SOVEREIGN_COMMERCIAL', message: 'Sovereign Enterprise Tier Validated' };
            }
            if (tierCode === 'PRO' || tierCode === 'STUDIO') {
                return { valid: true, tier: 'PRO_STUDIO', message: 'Pro Studio Tier Validated' };
            }
            return { valid: true, tier: 'COMMUNITY_DEV', message: 'Community Tier Validated' };
        }
        // Accept raw 32+ char cryptographic tokens as Sovereign Commercial
        if (key.length >= 32) {
            return { valid: true, tier: 'SOVEREIGN_COMMERCIAL', message: 'Cryptographic sovereign token accepted' };
        }
        this.recordViolation({
            source: 'kernel:license',
            type: 'INVALID_KEY',
            severity: 'MEDIUM',
            details: { keySnippet: key.substring(0, 6) + '...' },
            actionTaken: 'LOGGED_ONLY',
        });
        return {
            valid: false,
            tier: 'INVALID',
            message: 'Invalid PRIMORDIAOS_KEY format.',
        };
    }
    /**
     * Validates IPC message payload size and envelope structure
     */
    validateIPCEnvelope(envelope) {
        if (!envelope || typeof envelope !== 'object') {
            this.recordViolation({
                source: 'ipc:router',
                type: 'MALFORMED_IPC',
                severity: 'HIGH',
                details: { envelope },
                actionTaken: 'QUARANTINED',
            });
            return { allowed: false, reason: 'IPC envelope must be an object' };
        }
        if (!envelope.sourceRealm || !envelope.targetRealm || !envelope.channel) {
            this.recordViolation({
                source: envelope.sourceRealm || 'unknown',
                type: 'MALFORMED_IPC',
                severity: 'MEDIUM',
                details: { envelope },
                actionTaken: 'BLOCKED',
            });
            return { allowed: false, reason: 'IPC envelope missing required routing headers' };
        }
        // Rate limit check
        const rateCheck = this.checkRateLimit(this.ipcRateTracker, envelope.sourceRealm, this.config.maxIpcPerSecond);
        if (!rateCheck.allowed) {
            this.recordViolation({
                source: envelope.sourceRealm,
                type: 'RATE_LIMIT_EXCEEDED',
                severity: 'MEDIUM',
                details: { target: envelope.targetRealm, channel: envelope.channel },
                actionTaken: 'BLOCKED',
            });
            return { allowed: false, reason: `IPC rate limit exceeded for realm: ${envelope.sourceRealm}` };
        }
        // Payload size check
        if (envelope.payload) {
            try {
                const size = Buffer.byteLength(JSON.stringify(envelope.payload));
                if (size > this.config.maxPayloadBytes) {
                    this.recordViolation({
                        source: envelope.sourceRealm,
                        type: 'PAYLOAD_TOO_LARGE',
                        severity: 'HIGH',
                        details: { size, maxPayloadBytes: this.config.maxPayloadBytes },
                        actionTaken: 'QUARANTINED',
                    });
                    return { allowed: false, reason: `Payload exceeds limit of ${this.config.maxPayloadBytes} bytes` };
                }
            }
            catch {
                return { allowed: false, reason: 'Payload serialization failure' };
            }
        }
        return { allowed: true };
    }
    /**
     * Validates event topic and rate limit
     */
    validateEvent(topic, source, payload) {
        if (!topic || typeof topic !== 'string' || topic.trim() === '') {
            this.recordViolation({
                source,
                type: 'UNAUTHORIZED_EVENT',
                severity: 'MEDIUM',
                details: { topic },
                actionTaken: 'BLOCKED',
            });
            return { allowed: false, reason: 'Event topic cannot be empty' };
        }
        const rateCheck = this.checkRateLimit(this.eventRateTracker, source, this.config.maxEventsPerSecond);
        if (!rateCheck.allowed) {
            this.recordViolation({
                source,
                type: 'RATE_LIMIT_EXCEEDED',
                severity: 'HIGH',
                details: { topic },
                actionTaken: 'BLOCKED',
            });
            return { allowed: false, reason: `Event rate limit exceeded for source: ${source}` };
        }
        if (payload !== undefined && payload !== null) {
            try {
                const serialized = JSON.stringify(payload);
                if (Buffer.byteLength(serialized) > this.config.maxPayloadBytes) {
                    this.recordViolation({
                        source,
                        type: 'PAYLOAD_TOO_LARGE',
                        severity: 'HIGH',
                        details: { topic },
                        actionTaken: 'QUARANTINED',
                    });
                    return { allowed: false, reason: 'Event payload size exceeded' };
                }
            }
            catch {
                return { allowed: false, reason: 'Event payload serialization failed' };
            }
        }
        return { allowed: true };
    }
    /**
     * Guards against runaway tasks
     */
    getTaskExecutionTimeout() {
        return this.config.maxTaskExecutionMs;
    }
    reportRunawayTask(taskId, name, elapsedMs) {
        this.recordViolation({
            source: `task:${taskId}`,
            type: 'RUNAWAY_TASK',
            severity: 'CRITICAL',
            details: { taskId, name, elapsedMs, timeoutLimit: this.config.maxTaskExecutionMs },
            actionTaken: 'TERMINATED',
        });
    }
    /**
     * Quarantines an arbitrary payload
     */
    quarantine(source, reason, rawPayload) {
        const violation = this.recordViolation({
            source,
            type: 'MALFORMED_IPC',
            severity: 'HIGH',
            details: { reason, rawPayload },
            actionTaken: 'QUARANTINED',
        });
        return violation.id;
    }
    getQuarantineLedger(limit = 100) {
        return this.quarantineLedger.slice(-limit);
    }
    recordViolation(violation) {
        const fullViolation = {
            id: `viol-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            timestamp: new Date().toISOString(),
            ...violation,
        };
        this.quarantineLedger.push(fullViolation);
        if (this.quarantineLedger.length > 500) {
            this.quarantineLedger.shift();
        }
        this.logger.logSafety(fullViolation.type, fullViolation.severity === 'HIGH' || fullViolation.severity === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM', {
            violationId: fullViolation.id,
            source: fullViolation.source,
            action: fullViolation.actionTaken,
            details: fullViolation.details,
        });
        return fullViolation;
    }
    checkRateLimit(tracker, key, maxPerSecond) {
        const now = Date.now();
        const timestamps = tracker.get(key) || [];
        const oneSecondAgo = now - 1000;
        // Prune entries older than 1 second
        const recent = timestamps.filter(t => t > oneSecondAgo);
        if (recent.length >= maxPerSecond) {
            tracker.set(key, recent);
            return { allowed: false };
        }
        recent.push(now);
        tracker.set(key, recent);
        return { allowed: true };
    }
}
