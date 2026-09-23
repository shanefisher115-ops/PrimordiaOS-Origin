/**
 * PrimordiaOS Sovereign Cockpit — Cockpit State Machine
 * Deterministic finite state machine governing cockpit operational lifecycles.
 */

import { logger } from '../logging/CockpitLogger.js';

export type CockpitState =
  | 'INITIALIZING'
  | 'IDLE'
  | 'CHARGED'
  | 'FLUX'
  | 'PANIC'
  | 'SHUTDOWN';

export interface StateTransitionRecord {
  from: CockpitState;
  to: CockpitState;
  timestamp: number;
  reason: string;
  metadata?: Record<string, unknown>;
}

export type StateTransitionListener = (transition: StateTransitionRecord) => void;
export type StateGuard = (from: CockpitState, to: CockpitState, reason: string) => boolean;

export class CockpitStateMachine {
  private currentState: CockpitState = 'INITIALIZING';
  private transitionHistory: StateTransitionRecord[] = [];
  private readonly maxHistoryLength: number = 200;
  private listeners: Set<StateTransitionListener> = new Set();
  private guards: StateGuard[] = [];

  // Allowed state transitions map
  private readonly validTransitions: Record<CockpitState, CockpitState[]> = {
    INITIALIZING: ['IDLE', 'PANIC', 'SHUTDOWN'],
    IDLE: ['CHARGED', 'FLUX', 'PANIC', 'SHUTDOWN'],
    CHARGED: ['IDLE', 'FLUX', 'PANIC', 'SHUTDOWN'],
    FLUX: ['IDLE', 'CHARGED', 'PANIC', 'SHUTDOWN'],
    PANIC: ['IDLE', 'SHUTDOWN'], // Requires deliberate recovery to IDLE
    SHUTDOWN: [] // Terminal state
  };

  constructor() {
    this.recordTransition('INITIALIZING', 'INITIALIZING', 'Subsystem instantiation');
  }

  public getState(): CockpitState {
    return this.currentState;
  }

  public is(state: CockpitState): boolean {
    return this.currentState === state;
  }

  public addGuard(guard: StateGuard): void {
    this.guards.push(guard);
  }

  public subscribe(listener: StateTransitionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public transition(targetState: CockpitState, reason: string = 'Normal transition', metadata?: Record<string, unknown>): boolean {
    if (this.currentState === targetState) {
      return true; // No-op idempotent
    }

    if (this.currentState === 'SHUTDOWN') {
      logger.warn('CockpitStateMachine', `Refused transition from terminal SHUTDOWN state to ${targetState}`);
      return false;
    }

    const allowed = this.validTransitions[this.currentState];
    if (!allowed.includes(targetState)) {
      logger.error('CockpitStateMachine', `Invalid state transition requested: ${this.currentState} -> ${targetState} (${reason})`);
      return false;
    }

    // Execute user-registered guards
    for (const guard of this.guards) {
      if (!guard(this.currentState, targetState, reason)) {
        logger.warn('CockpitStateMachine', `Transition ${this.currentState} -> ${targetState} rejected by guard condition (${reason})`);
        return false;
      }
    }

    const previousState = this.currentState;
    this.currentState = targetState;

    const record = this.recordTransition(previousState, targetState, reason, metadata);
    logger.info('CockpitStateMachine', `State Transition: [${previousState}] -> [${targetState}] | Reason: ${reason}`, metadata);

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(record);
      } catch (listenerError) {
        logger.error('CockpitStateMachine', `Error in state listener: ${listenerError}`);
      }
    }

    return true;
  }

  public getHistory(limit: number = 50): StateTransitionRecord[] {
    return this.transitionHistory.slice(-limit);
  }

  private recordTransition(
    from: CockpitState,
    to: CockpitState,
    reason: string,
    metadata?: Record<string, unknown>
  ): StateTransitionRecord {
    const record: StateTransitionRecord = {
      from,
      to,
      timestamp: Date.now(),
      reason,
      metadata
    };

    if (this.transitionHistory.length >= this.maxHistoryLength) {
      this.transitionHistory.shift();
    }
    this.transitionHistory.push(record);
    return record;
  }
}
