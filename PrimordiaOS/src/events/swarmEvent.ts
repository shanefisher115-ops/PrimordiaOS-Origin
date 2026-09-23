import { PrimordiaEvent } from '../core/eventBus';

export interface SwarmEventData {
  task: string;
  payload?: unknown;
}

export type SwarmEvent = PrimordiaEvent<SwarmEventData>;
