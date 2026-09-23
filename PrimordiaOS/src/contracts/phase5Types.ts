// src/contracts/phase5Types.ts

export type AgentRole = 'ARCHITECT' | 'BUILDER' | 'AUDITOR' | 'DISPATCHER';

export type AgentTaskStatus = 'PENDING' | 'EXECUTING' | 'VERIFIED' | 'FAILED' | 'COMMITTED';

export interface AgentTask {
  taskId: string;
  role: AgentRole;
  objective: string;
  targetRealm: string;
  payload: Record<string, any>;
  status: AgentTaskStatus;
  retryCount: number;
  createdAt: number;
  completedAt?: number;
  idempotencyKey?: string;
  auditHash?: string;
  error?: string;
}

export interface SwarmExecutionLog {
  executionId: string;
  timestamp: number;
  activeAgents: AgentRole[];
  tasksProcessed: number;
  systemEntropy: number;
  antigravScore: number;
}

/**
 * Encrypted/Signed local message format for Swarm EventBus.
 */
export interface SwarmMessage {
  readonly messageId: string;
  readonly senderRole: AgentRole | 'COORDINATOR';
  readonly recipientRole: AgentRole | 'BROADCAST' | 'COORDINATOR';
  readonly topic: string;
  readonly payload: Record<string, any>;
  readonly timestamp: number;
  readonly signature: string;
}

/**
 * Cross-realm action execution contract.
 */
export interface CrossRealmExecutionRequest {
  readonly requestId: string;
  readonly originRealm: string;
  readonly targetRealm: string;
  readonly actionType: 'PROVISION_ENDPOINT' | 'TRIGGER_OFFER' | 'INSCRIBE_CHRONICLE' | 'SCALE_DEPLOYMENT';
  readonly payload: Record<string, any>;
  readonly timestamp: number;
}

export interface CrossRealmExecutionResult {
  readonly requestId: string;
  readonly success: boolean;
  readonly targetRealm: string;
  readonly resultingArtifactId?: string;
  readonly auditHash: string;
  readonly executedAt: number;
  readonly error?: string;
}

/**
 * Specification and output for Autonomous Microservice Synthesizer.
 */
export interface MicroserviceRouteSpec {
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly path: string;
  readonly handlerDescription: string;
  readonly inputSchema?: Record<string, any>;
  readonly outputSchema?: Record<string, any>;
}

export interface MicroserviceSpec {
  readonly serviceName: string;
  readonly version: string;
  readonly realm: string;
  readonly port: number;
  readonly routes: readonly MicroserviceRouteSpec[];
  readonly dependencies: readonly string[];
}

export interface SynthesizedMicroservice {
  readonly serviceId: string;
  readonly spec: MicroserviceSpec;
  readonly sourceCode: string;
  readonly testCode: string;
  readonly filePath: string;
  readonly verified: boolean;
  readonly antigravScore: number;
  readonly sha256Hash: string;
  readonly synthesizedAt: number;
}

/**
 * Deployment targets and verification record for DeployMatrix.
 */
export type DeployTargetEnvironment = 'local_daemon' | 'container_vessel' | 'cloud_run';

export interface DeployTarget {
  readonly targetId: string;
  readonly environment: DeployTargetEnvironment;
  readonly host: string;
  readonly port: number;
  readonly healthPath: string;
}

export interface DeployRecord {
  readonly deployId: string;
  readonly serviceId: string;
  readonly target: DeployTarget;
  readonly status: 'DEPLOYED' | 'ROLLED_BACK' | 'FAILED_PREFLIGHT';
  readonly healthChecked: boolean;
  readonly latencyMs: number;
  readonly auditHash: string;
  readonly deployedAt: number;
}

export interface SwarmState {
  readonly coordinatorId: string;
  readonly activeAgents: AgentRole[];
  readonly pendingTaskCount: number;
  readonly completedTaskCount: number;
  readonly failedTaskCount: number;
  readonly lastExecutionTs: number;
  readonly systemEntropy: number;
  readonly antigravScore: number;
}
