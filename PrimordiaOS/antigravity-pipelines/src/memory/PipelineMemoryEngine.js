import { createHash } from 'node:crypto';
import { PipelineLogger } from '../logging/PipelineLogger.js';
export class PipelineMemoryEngine {
    static instance = null;
    version = 1;
    pipelineStates = new Map();
    executionHistory = new Map(); // runId -> result
    idempotencyStore = new Map();
    agentMetadataStore = new Map();
    logger;
    constructor(logger) {
        this.logger = logger ?? PipelineLogger.getInstance();
    }
    static getInstance() {
        if (!PipelineMemoryEngine.instance) {
            PipelineMemoryEngine.instance = new PipelineMemoryEngine();
        }
        return PipelineMemoryEngine.instance;
    }
    getVersion() {
        return this.version;
    }
    computeStateChecksum(data) {
        return createHash('sha256').update(JSON.stringify(data ?? {})).digest('hex');
    }
    /**
     * Evaluates if a pipeline run with the same idempotency key has already completed successfully.
     */
    checkIdempotency(key, ttlMs = 3600000) {
        const cached = this.idempotencyStore.get(key);
        if (!cached)
            return null;
        const age = Date.now() - cached.cachedAt;
        if (age > ttlMs) {
            this.idempotencyStore.delete(key);
            return null;
        }
        this.logger.debug('PipelineMemoryEngine', `Idempotency hit for key '${key}' -> runId '${cached.runId}'`);
        return cached.result;
    }
    recordIdempotency(key, result) {
        this.idempotencyStore.set(key, {
            runId: result.runId,
            cachedAt: Date.now(),
            result,
        });
    }
    getPipelineState(pipelineId) {
        let state = this.pipelineStates.get(pipelineId);
        if (!state) {
            state = {
                pipelineId,
                status: 'IDLE',
                variables: {},
                version: 1,
            };
            this.pipelineStates.set(pipelineId, state);
        }
        return { ...state, variables: { ...state.variables } };
    }
    updatePipelineState(pipelineId, updates) {
        const current = this.getPipelineState(pipelineId);
        const updated = {
            ...current,
            ...updates,
            variables: {
                ...current.variables,
                ...(updates.variables ?? {}),
            },
            version: current.version + 1,
        };
        this.pipelineStates.set(pipelineId, updated);
        this.version += 1;
        this.logger.debug('PipelineMemoryEngine', `State updated for pipeline '${pipelineId}' (v${updated.version})`);
        return updated;
    }
    setPipelineVariable(pipelineId, key, value) {
        const state = this.getPipelineState(pipelineId);
        state.variables[key] = value;
        state.version += 1;
        this.pipelineStates.set(pipelineId, state);
        this.version += 1;
    }
    getPipelineVariable(pipelineId, key) {
        const state = this.pipelineStates.get(pipelineId);
        return state?.variables[key];
    }
    recordExecutionResult(result) {
        this.executionHistory.set(result.runId, result);
        this.updatePipelineState(result.pipelineId, {
            lastRunId: result.runId,
            lastExecutedAt: result.completedAt,
            status: result.success ? 'IDLE' : 'ERROR',
        });
    }
    getExecutionResult(runId) {
        return this.executionHistory.get(runId);
    }
    getRecentExecutions(limit = 50) {
        return Array.from(this.executionHistory.values())
            .sort((a, b) => b.completedAt - a.completedAt)
            .slice(0, limit);
    }
    setAgentMetadata(agentId, meta) {
        const existing = this.agentMetadataStore.get(agentId) ?? {};
        this.agentMetadataStore.set(agentId, { ...existing, ...meta, updatedAt: Date.now() });
    }
    getAgentMetadata(agentId) {
        return this.agentMetadataStore.get(agentId);
    }
    createSnapshot(quarantined = {}) {
        const states = {};
        for (const [id, s] of this.pipelineStates.entries()) {
            states[id] = {
                lastRunId: s.lastRunId,
                lastExecutedAt: s.lastExecutedAt,
                status: s.status,
                variables: { ...s.variables },
            };
        }
        return {
            snapshotId: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            version: this.version,
            timestamp: Date.now(),
            pipelineStates: states,
            executionHistory: Array.from(this.executionHistory.values()).slice(-100),
            quarantinedEntities: { ...quarantined },
        };
    }
    restoreSnapshot(snapshot) {
        this.version = snapshot.version;
        this.pipelineStates.clear();
        for (const [id, state] of Object.entries(snapshot.pipelineStates)) {
            this.pipelineStates.set(id, {
                pipelineId: id,
                lastRunId: state.lastRunId,
                lastExecutedAt: state.lastExecutedAt,
                status: state.status,
                variables: { ...state.variables },
                version: 1,
            });
        }
        this.executionHistory.clear();
        for (const item of snapshot.executionHistory) {
            this.executionHistory.set(item.runId, item);
        }
        this.logger.info('PipelineMemoryEngine', `Restored snapshot ${snapshot.snapshotId} (v${snapshot.version})`);
    }
    clear() {
        this.pipelineStates.clear();
        this.executionHistory.clear();
        this.idempotencyStore.clear();
        this.agentMetadataStore.clear();
        this.version = 1;
    }
}
