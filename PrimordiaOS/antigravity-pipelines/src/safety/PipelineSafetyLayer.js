import { PipelineLogger } from '../logging/PipelineLogger.js';
export class PipelineSafetyLayer {
    defaultPolicy;
    quarantinedEntities = new Map();
    activeExecutionHops = new Map(); // runId -> hopCount
    logger;
    constructor(policy, logger) {
        this.logger = logger ?? PipelineLogger.getInstance();
        this.defaultPolicy = {
            maxRunDurationMs: policy?.maxRunDurationMs ?? 120000, // 2 minutes max
            maxExecutionHops: policy?.maxExecutionHops ?? 100,
            maxRetriesPerNode: policy?.maxRetriesPerNode ?? 3,
            allowCycleFallback: policy?.allowCycleFallback ?? false,
            blockDestructiveDiskOps: policy?.blockDestructiveDiskOps ?? true,
            quarantineThresholdFailures: policy?.quarantineThresholdFailures ?? 3,
            ...policy,
        };
    }
    getPolicy() {
        return { ...this.defaultPolicy };
    }
    isQuarantined(entityId) {
        return this.quarantinedEntities.has(entityId);
    }
    getQuarantineRecord(entityId) {
        return this.quarantinedEntities.get(entityId);
    }
    getAllQuarantined() {
        return Array.from(this.quarantinedEntities.values());
    }
    releaseQuarantine(entityId) {
        const deleted = this.quarantinedEntities.delete(entityId);
        if (deleted) {
            this.logger.info('PipelineSafetyLayer', `Released entity '${entityId}' from quarantine.`);
        }
        return deleted;
    }
    quarantineEntity(entityId, entityType, reason, failureCount = 1, remedyHint) {
        const record = {
            entityId,
            entityType,
            reason,
            timestamp: Date.now(),
            failureCount,
            remedyHint,
        };
        this.quarantinedEntities.set(entityId, record);
        this.logger.safetyLog(`QUARANTINE_${entityType}`, `Entity '${entityId}' isolated: ${reason}`, {
            nodeId: entityType === 'NODE' ? entityId : undefined,
            pipelineId: entityType === 'PIPELINE' ? entityId : undefined,
        });
        return record;
    }
    /**
     * Validates a pipeline definition against safety policy prior to DAG compilation.
     */
    validatePipelineSafety(pipeline) {
        const violations = [];
        if (this.isQuarantined(pipeline.id)) {
            violations.push({
                rule: 'PIPELINE_QUARANTINED',
                reason: `Pipeline '${pipeline.id}' is quarantined: ${this.quarantinedEntities.get(pipeline.id)?.reason}`,
                pipelineId: pipeline.id,
                severity: 'FATAL',
                timestamp: Date.now(),
            });
            return violations;
        }
        if (!pipeline.nodes || pipeline.nodes.length === 0) {
            violations.push({
                rule: 'EMPTY_PIPELINE',
                reason: 'Pipeline definition has zero execution nodes.',
                pipelineId: pipeline.id,
                severity: 'FATAL',
                timestamp: Date.now(),
            });
        }
        // Check for quarantined nodes or invalid action declarations
        for (const node of pipeline.nodes) {
            if (this.isQuarantined(node.id)) {
                violations.push({
                    rule: 'NODE_QUARANTINED',
                    reason: `Node '${node.id}' in pipeline '${pipeline.id}' is currently quarantined.`,
                    nodeId: node.id,
                    pipelineId: pipeline.id,
                    severity: 'CRITICAL',
                    timestamp: Date.now(),
                });
            }
            if (this.defaultPolicy.blockDestructiveDiskOps) {
                const action = (node.action || '').toLowerCase();
                if (action.includes('rm_rf') || action.includes('wipe_disk') || action.includes('drop_database')) {
                    violations.push({
                        rule: 'DESTRUCTIVE_OPERATION_BLOCKED',
                        reason: `Action '${node.action}' requires sovereign explicit authorization and is blocked by default safety policy.`,
                        nodeId: node.id,
                        pipelineId: pipeline.id,
                        severity: 'FATAL',
                        timestamp: Date.now(),
                    });
                }
            }
        }
        return violations;
    }
    /**
     * Validates graph topology to guard against invalid DAG structures.
     */
    validateGraphTopology(graph, pipelineId) {
        const violations = [];
        const validation = graph.validate();
        if (validation.hasCycle) {
            violations.push({
                rule: 'CYCLE_DETECTED',
                reason: `Cyclic dependency detected: ${validation.errors.join('; ')}`,
                pipelineId,
                severity: 'FATAL',
                timestamp: Date.now(),
            });
        }
        if (validation.deadlockNodes.length > 0) {
            violations.push({
                rule: 'DEADLOCK_DETECTED',
                reason: `Deadlocked nodes identified: ${validation.deadlockNodes.join(', ')}`,
                pipelineId,
                severity: 'FATAL',
                timestamp: Date.now(),
            });
        }
        return violations;
    }
    /**
     * Guards against runaway agent loops by tracking execution hops per runId.
     */
    registerHop(runId, nodeId) {
        const current = (this.activeExecutionHops.get(runId) ?? 0) + 1;
        this.activeExecutionHops.set(runId, current);
        if (current > this.defaultPolicy.maxExecutionHops) {
            this.quarantineEntity(nodeId, 'NODE', `Runaway execution: Exceeded max hops (${current} > ${this.defaultPolicy.maxExecutionHops}) in run '${runId}'`, current, 'Review graph fan-out or recursive loops');
            throw new Error(`Safety Violation: Runaway execution detected. Run '${runId}' exceeded maximum execution hops (${this.defaultPolicy.maxExecutionHops}).`);
        }
    }
    clearRunHops(runId) {
        this.activeExecutionHops.delete(runId);
    }
    recordNodeFailure(nodeId, error) {
        const existing = this.quarantinedEntities.get(nodeId);
        const count = (existing ? existing.failureCount : 0) + 1;
        if (count >= this.defaultPolicy.quarantineThresholdFailures) {
            this.quarantineEntity(nodeId, 'NODE', `Repeated failures (${count}): ${error}`, count, 'Inspect node task inputs, target availability, or schema contracts');
        }
    }
}
