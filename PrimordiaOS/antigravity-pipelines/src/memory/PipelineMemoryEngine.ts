import { createHash } from 'node:crypto';
import {
  MemorySnapshot,
  PipelineExecutionResult,
  QuarantineRecord,
} from '../core/types.js';
import { PipelineLogger } from '../logging/PipelineLogger.js';

interface PipelinePersistentState {
  pipelineId: string;
  lastRunId?: string;
  lastExecutedAt?: number;
  status: string;
  variables: Record<string, unknown>;
  version: number;
}

export class PipelineMemoryEngine {
  private static instance: PipelineMemoryEngine | null = null;
  private version = 1;
  private pipelineStates: Map<string, PipelinePersistentState> = new Map();
  private executionHistory: Map<string, PipelineExecutionResult> = new Map(); // runId -> result
  private idempotencyStore: Map<string, { runId: string; cachedAt: number; result: PipelineExecutionResult }> = new Map();
  private agentMetadataStore: Map<string, Record<string, unknown>> = new Map();
  private logger: PipelineLogger;

  constructor(logger?: PipelineLogger) {
    this.logger = logger ?? PipelineLogger.getInstance();
  }

  public static getInstance(): PipelineMemoryEngine {
    if (!PipelineMemoryEngine.instance) {
      PipelineMemoryEngine.instance = new PipelineMemoryEngine();
    }
    return PipelineMemoryEngine.instance;
  }

  public getVersion(): number {
    return this.version;
  }

  public computeStateChecksum(data: unknown): string {
    return createHash('sha256').update(JSON.stringify(data ?? {})).digest('hex');
  }

  /**
   * Evaluates if a pipeline run with the same idempotency key has already completed successfully.
   */
  public checkIdempotency(key: string, ttlMs = 3600000): PipelineExecutionResult | null {
    const cached = this.idempotencyStore.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.cachedAt;
    if (age > ttlMs) {
      this.idempotencyStore.delete(key);
      return null;
    }

    this.logger.debug('PipelineMemoryEngine', `Idempotency hit for key '${key}' -> runId '${cached.runId}'`);
    return cached.result;
  }

  public recordIdempotency(key: string, result: PipelineExecutionResult): void {
    this.idempotencyStore.set(key, {
      runId: result.runId,
      cachedAt: Date.now(),
      result,
    });
  }

  public getPipelineState(pipelineId: string): PipelinePersistentState {
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

  public updatePipelineState(
    pipelineId: string,
    updates: Partial<Omit<PipelinePersistentState, 'pipelineId' | 'version'>>
  ): PipelinePersistentState {
    const current = this.getPipelineState(pipelineId);
    const updated: PipelinePersistentState = {
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

  public setPipelineVariable(pipelineId: string, key: string, value: unknown): void {
    const state = this.getPipelineState(pipelineId);
    state.variables[key] = value;
    state.version += 1;
    this.pipelineStates.set(pipelineId, state);
    this.version += 1;
  }

  public getPipelineVariable<T = unknown>(pipelineId: string, key: string): T | undefined {
    const state = this.pipelineStates.get(pipelineId);
    return state?.variables[key] as T | undefined;
  }

  public recordExecutionResult(result: PipelineExecutionResult): void {
    this.executionHistory.set(result.runId, result);
    this.updatePipelineState(result.pipelineId, {
      lastRunId: result.runId,
      lastExecutedAt: result.completedAt,
      status: result.success ? 'IDLE' : 'ERROR',
    });
  }

  public getExecutionResult(runId: string): PipelineExecutionResult | undefined {
    return this.executionHistory.get(runId);
  }

  public getRecentExecutions(limit = 50): PipelineExecutionResult[] {
    return Array.from(this.executionHistory.values())
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, limit);
  }

  public setAgentMetadata(agentId: string, meta: Record<string, unknown>): void {
    const existing = this.agentMetadataStore.get(agentId) ?? {};
    this.agentMetadataStore.set(agentId, { ...existing, ...meta, updatedAt: Date.now() });
  }

  public getAgentMetadata(agentId: string): Record<string, unknown> | undefined {
    return this.agentMetadataStore.get(agentId);
  }

  public createSnapshot(quarantined: Record<string, QuarantineRecord> = {}): MemorySnapshot {
    const states: Record<string, { lastRunId?: string; lastExecutedAt?: number; status: string; variables: Record<string, unknown> }> = {};
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

  public restoreSnapshot(snapshot: MemorySnapshot): void {
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

  public clear(): void {
    this.pipelineStates.clear();
    this.executionHistory.clear();
    this.idempotencyStore.clear();
    this.agentMetadataStore.clear();
    this.version = 1;
  }
}
