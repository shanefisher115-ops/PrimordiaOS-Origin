import { PrimordiaEvent } from '../core/eventBus';

export interface AgentEventData {
  agentId: string;
  action: string;
  payload?: unknown;
}

export type AgentEvent = PrimordiaEvent<AgentEventData>;
