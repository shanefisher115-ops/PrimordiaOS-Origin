import {
  AgentTarget,
  ExecutionNodeConfig,
  NodeExecutionStatus,
  NodeExecutionTrace,
} from '../core/types.js';

export class ExecutionNode {
  public readonly id: string;
  public readonly name: string;
  public readonly agentTarget: AgentTarget;
  public readonly action: string;
  public readonly params: Record<string, unknown>;
  public readonly maxRetries: number;
  public readonly timeoutMs: number;
  public readonly fallbackTarget?: AgentTarget;
  public readonly critical: boolean;

  private status: NodeExecutionStatus = 'PENDING';
  private retriesAttempted = 0;
  private startedAt?: number;
  private completedAt?: number;
  private input: Record<string, unknown> = {};
  private output?: Record<string, unknown>;
  private error?: string;

  constructor(config: ExecutionNodeConfig) {
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

  public getStatus(): NodeExecutionStatus {
    return this.status;
  }

  public setStatus(status: NodeExecutionStatus): void {
    this.status = status;
  }

  public getRetriesAttempted(): number {
    return this.retriesAttempted;
  }

  public incrementRetries(): number {
    this.retriesAttempted += 1;
    return this.retriesAttempted;
  }

  public canRetry(): boolean {
    return this.retriesAttempted < this.maxRetries;
  }

  public start(input: Record<string, unknown>): void {
    this.status = 'RUNNING';
    this.startedAt = Date.now();
    this.input = { ...this.params, ...input };
  }

  public complete(output: Record<string, unknown>): void {
    this.status = 'COMPLETED';
    this.completedAt = Date.now();
    this.output = output;
  }

  public fail(error: string): void {
    this.status = 'FAILED';
    this.completedAt = Date.now();
    this.error = error;
  }

  public skip(reason?: string): void {
    this.status = 'SKIPPED';
    this.completedAt = Date.now();
    this.output = { skipped: true, reason: reason ?? 'Condition unfulfilled' };
  }

  public quarantine(reason: string): void {
    this.status = 'QUARANTINED';
    this.completedAt = Date.now();
    this.error = `Quarantined by Safety Layer: ${reason}`;
  }

  public getInput(): Record<string, unknown> {
    return { ...this.input };
  }

  public getOutput(): Record<string, unknown> | undefined {
    return this.output ? { ...this.output } : undefined;
  }

  public getError(): string | undefined {
    return this.error;
  }

  public getDurationMs(): number {
    if (!this.startedAt) return 0;
    const end = this.completedAt ?? Date.now();
    return Math.max(0, end - this.startedAt);
  }

  public getTrace(): NodeExecutionTrace {
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

  public reset(): void {
    this.status = 'PENDING';
    this.retriesAttempted = 0;
    this.startedAt = undefined;
    this.completedAt = undefined;
    this.input = {};
    this.output = undefined;
    this.error = undefined;
  }
}
