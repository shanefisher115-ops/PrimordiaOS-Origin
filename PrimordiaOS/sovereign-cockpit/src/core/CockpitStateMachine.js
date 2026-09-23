/**
 * PrimordiaOS Sovereign Cockpit — Cockpit State Machine
 * Deterministic finite state machine governing cockpit operational lifecycles.
 */
import { logger } from '../logging/CockpitLogger.js';
export class CockpitStateMachine {
    currentState = 'INITIALIZING';
    transitionHistory = [];
    maxHistoryLength = 200;
    listeners = new Set();
    guards = [];
    // Allowed state transitions map
    validTransitions = {
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
    getState() {
        return this.currentState;
    }
    is(state) {
        return this.currentState === state;
    }
    addGuard(guard) {
        this.guards.push(guard);
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    transition(targetState, reason = 'Normal transition', metadata) {
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
            }
            catch (listenerError) {
                logger.error('CockpitStateMachine', `Error in state listener: ${listenerError}`);
            }
        }
        return true;
    }
    getHistory(limit = 50) {
        return this.transitionHistory.slice(-limit);
    }
    recordTransition(from, to, reason, metadata) {
        const record = {
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
