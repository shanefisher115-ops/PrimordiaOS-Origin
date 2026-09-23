/**
 * PrimordiaOS Antigravity Pipeline Engine - Core Type Definitions
 * Strict contractual interfaces for multi-agent DAG execution, routing, memory, and safety.
 */

export type EngineLifecycleState =
  | 'UNINITIALIZED'
  | 'BOOTING'
  | 'RUNNING'
  | 'PAUSED'
  | 'SHUTTING_DOWN'
  | 'TERMINATED'
  | 'FAILED';

export type NodeExecutionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED'
  | 'QUARANTINED';

export type AgentTarget =
  | 'ANTIGRAVITY'
  | 'VERTEX_AI'
  | 'KERNEL'
  | 'CUSTOM';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  subsystem: string;
  message: string;
  pipelineId?: string;
  runId?: string;
  nodeId?: string;
  traceId?: string;
  data?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    code?: string | number;
  };
}

export interface EngineEnvironmentConfig {
  antigravityGatewayUrl: string;
  vertexAiUrl: string;
  primordiaOsKernelUrl: string;
  port: number;
  environment: 'development' | 'production' | 'test';
  maxConcurrentNodes: number;
  defaultNodeTimeoutMs: number;
  maxExecutionHops: number;
}

export interface AgentTaskRequest {
  taskId: string;
  pipelineId: string;
  nodeId: string;
  runId: string;
  target: AgentTarget;
  action: string;
  payload: Record<string, unknown>;
  metadata: {
    origin: string;
    timestamp: number;
    timeoutMs?: number;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
    traceId: string;
  };
}

export interface AgentTaskResponse {
  taskId: string;
  nodeId: string;
  target: AgentTarget;
  success: boolean;
  output: Record<string, unknown>;
  latencyMs: number;
  error?: string;
  telemetry?: {
    model?: string;
    tokensUsed?: number;
    costEstimateUsd?: number;
    quarantineRecommended?: boolean;
  };
}

export interface EdgeCondition {
  field?: string;
  operator?: 'equals' | 'notEquals' | 'contains' | 'exists' | 'greaterThan' | 'lessThan';
  value?: unknown;
  predicate?: (output: Record<string, unknown>) => boolean;
}

export interface ExecutionEdgeDefinition {
  fromNodeId: string;
  toNodeId: string;
  condition?: EdgeCondition;
  transform?: (upstreamData: Record<string, unknown>) => Record<string, unknown>;
  id?: string;
}

export interface ExecutionNodeConfig {
  id: string;
  name: string;
  agentTarget: AgentTarget;
  action: string;
  params?: Record<string, unknown>;
  maxRetries?: number;
  timeoutMs?: number;
  fallbackTarget?: AgentTarget;
  critical?: boolean;
}

export interface NodeExecutionTrace {
  nodeId: string;
  name: string;
  agentTarget: AgentTarget;
  status: NodeExecutionStatus;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  retriesAttempted: number;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

export interface PipelineDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  tags: string[];
  nodes: ExecutionNodeConfig[];
  edges: ExecutionEdgeDefinition[];
  defaultTimeoutMs?: number;
  safetyPolicy?: Partial<SafetyPolicy>;
}

export interface PipelineExecutionOptions {
  runId?: string;
  traceId?: string;
  initialInput?: Record<string, unknown>;
  timeoutMs?: number;
  dryRun?: boolean;
  idempotencyKey?: string;
}

export interface PipelineExecutionResult {
  runId: string;
  pipelineId: string;
  pipelineName: string;
  success: boolean;
  startedAt: number;
  completedAt: number;
  totalDurationMs: number;
  traces: Record<string, NodeExecutionTrace>;
  finalOutputs: Record<string, unknown>;
  error?: string;
  quarantinedNodes: string[];
}

export interface SafetyPolicy {
  maxRunDurationMs: number;
  maxExecutionHops: number;
  maxRetriesPerNode: number;
  allowCycleFallback: boolean;
  blockDestructiveDiskOps: boolean;
  quarantineThresholdFailures: number;
}

export interface SafetyViolation {
  rule: string;
  reason: string;
  nodeId?: string;
  pipelineId?: string;
  severity: 'WARNING' | 'CRITICAL' | 'FATAL';
  timestamp: number;
}

export interface QuarantineRecord {
  entityId: string;
  entityType: 'NODE' | 'AGENT' | 'PIPELINE';
  reason: string;
  timestamp: number;
  failureCount: number;
  remedyHint?: string;
}

export interface MemorySnapshot {
  snapshotId: string;
  version: number;
  timestamp: number;
  pipelineStates: Record<string, {
    lastRunId?: string;
    lastExecutedAt?: number;
    status: string;
    variables: Record<string, unknown>;
  }>;
  executionHistory: PipelineExecutionResult[];
  quarantinedEntities: Record<string, QuarantineRecord>;
}
