export type RealmId = string;
export type AgentId = string;
export type WorkflowId = string;
export type ResourceId = string;
export type ConstraintId = string;
export type SignalId = string;

export interface Realm {
  id: RealmId;
  name: string;
  description?: string;
  rules: ConstraintId[];
  allowedAgents: AgentId[];
  allowedWorkflows: WorkflowId[];
}

export interface Agent {
  id: AgentId;
  name: string;
  homeRealm: RealmId;
  capabilities: string[];
  interfaces: string[];
  constraints: ConstraintId[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  realm: RealmId;
  requiredAgents: AgentId[];
  requiredResources: ResourceId[];
  preconditions: ConstraintId[];
  postconditions: ConstraintId[];
}

export interface Workflow {
  id: WorkflowId;
  name: string;
  description?: string;
  steps: WorkflowStep[];
}
