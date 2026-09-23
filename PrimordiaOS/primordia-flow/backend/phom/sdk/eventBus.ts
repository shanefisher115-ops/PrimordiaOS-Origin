/**
 * ==============================================================================
 * ⭐ PHOM SDK — TYPE-SAFE EVENT BUS
 * Real-time event propagation across all layers and subscribers.
 * ==============================================================================
 */

import { EventEmitter } from 'events';
import { PhomEventMap } from './types';

export class PhomEventBus {
  private emitter: EventEmitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  public on<K extends keyof PhomEventMap>(event: K, listener: (data: PhomEventMap[K]) => void | Promise<void>): this {
    this.emitter.on(event, listener as (...args: any[]) => void);
    return this;
  }

  public once<K extends keyof PhomEventMap>(event: K, listener: (data: PhomEventMap[K]) => void | Promise<void>): this {
    this.emitter.once(event, listener as (...args: any[]) => void);
    return this;
  }

  public off<K extends keyof PhomEventMap>(event: K, listener: (data: PhomEventMap[K]) => void | Promise<void>): this {
    this.emitter.off(event, listener as (...args: any[]) => void);
    return this;
  }

  public emit<K extends keyof PhomEventMap>(event: K, data: PhomEventMap[K]): boolean {
    return this.emitter.emit(event, data);
  }

  public listenerCount<K extends keyof PhomEventMap>(event: K): number {
    return this.emitter.listenerCount(event);
  }

  public removeAllListeners(event?: keyof PhomEventMap): this {
    if (event) {
      this.emitter.removeAllListeners(event);
    } else {
      this.emitter.removeAllListeners();
    }
    return this;
  }
}

export const defaultEventBus = new PhomEventBus();
