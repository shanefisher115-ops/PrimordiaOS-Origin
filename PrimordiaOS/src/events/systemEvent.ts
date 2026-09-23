import { PrimordiaEvent } from '../core/eventBus';

export interface SystemEventData {
  type: 'BOOT' | 'SHUTDOWN' | 'ERROR';
  message: string;
}

export type SystemEvent = PrimordiaEvent<SystemEventData>;
