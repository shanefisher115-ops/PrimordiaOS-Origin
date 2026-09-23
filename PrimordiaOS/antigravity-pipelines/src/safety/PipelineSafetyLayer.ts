import {
  PipelineDefinition,
  QuarantineRecord,
  SafetyPolicy,
  SafetyViolation,
} from '../core/types.js';
import { ExecutionGraphEngine } from '../graph/ExecutionGraphEngine.js';
import { PipelineLogger } from '../logging/PipelineLogger.js';

export class PipelineSafetyLayer {
  private defaultPolicy: SafetyPolicy;
  private quarantinedEntities: Map<string, QuarantineRecord> = new Map();
  private activeExecutionHops: Map<string, number> = new Map(); // runId -> hopCount
  private logger: PipelineLogger;

  constructor(policy?: Partial<SafetyPolicy>, logger?: PipelineLogger) {
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

  public getPolicy(): SafetyPolicy {
    return { ...this.defaultPolicy };
  }

  public isQuarantined(entityId: string): boolean {
    return this.quarantinedEntities.has(entityId);
  }

  public getQuarantineRecord(entityId: string): QuarantineRecord | undefined {
    return this.quarantinedEntities.get(entityId);
  }

  public getAllQuarantined(): QuarantineRecord[] {
    return Array.from(this.quarantinedEntities.values());
  }

  public releaseQuarantine(entityId: string): boolean {
    const deleted = this.quarantinedEntities.delete(entityId);
    if (deleted) {
      this.logger.info('PipelineSafetyLayer', `Released entity '${entityId}' from quarantine.`);
    }
    return deleted;
  }

  public quarantineEntity(
    entityId: string,
    entityType: 'NODE' | 'AGENT' | 'PIPELINE',
    reason: string,
    failureCount = 1,
    remedyHint?: string
  ): QuarantineRecord {
    const record: QuarantineRecord = {
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
  public validatePipelineSafety(pipeline: PipelineDefinition): SafetyViolation[] {
    const violations: SafetyViolation[] = [];

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
  public validateGraphTopology(graph: ExecutionGraphEngine, pipelineId: string): SafetyViolation[] {
    const violations: SafetyViolation[] = [];
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
  public registerHop(runId: string, nodeId: string): void {
    const current = (this.activeExecutionHops.get(runId) ?? 0) + 1;
    this.activeExecutionHops.set(runId, current);

    if (current > this.defaultPolicy.maxExecutionHops) {
      this.quarantineEntity(
        nodeId,
        'NODE',
        `Runaway execution: Exceeded max hops (${current} > ${this.defaultPolicy.maxExecutionHops}) in run '${runId}'`,
        current,
        'Review graph fan-out or recursive loops'
      );
      throw new Error(
        `Safety Violation: Runaway execution detected. Run '${runId}' exceeded maximum execution hops (${this.defaultPolicy.maxExecutionHops}).`
      );
    }
  }

  public clearRunHops(runId: string): void {
    this.activeExecutionHops.delete(runId);
  }

  public recordNodeFailure(nodeId: string, error: string): void {
    const existing = this.quarantinedEntities.get(nodeId);
    const count = (existing ? existing.failureCount : 0) + 1;

    if (count >= this.defaultPolicy.quarantineThresholdFailures) {
      this.quarantineEntity(
        nodeId,
        'NODE',
        `Repeated failures (${count}): ${error}`,
        count,
        'Inspect node task inputs, target availability, or schema contracts'
      );
    }
  }
}
