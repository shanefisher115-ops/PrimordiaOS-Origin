/**
 * ==============================================================================
 * ⭐ PHOM SDK — TYPE-SAFE EVENT BUS
 * Real-time event propagation across all layers and subscribers.
 * ==============================================================================
 */
import { EventEmitter } from 'events';
export class PhomEventBus {
    emitter = new EventEmitter();
    constructor() {
        this.emitter.setMaxListeners(50);
    }
    on(event, listener) {
        this.emitter.on(event, listener);
        return this;
    }
    once(event, listener) {
        this.emitter.once(event, listener);
        return this;
    }
    off(event, listener) {
        this.emitter.off(event, listener);
        return this;
    }
    emit(event, data) {
        return this.emitter.emit(event, data);
    }
    listenerCount(event) {
        return this.emitter.listenerCount(event);
    }
    removeAllListeners(event) {
        if (event) {
            this.emitter.removeAllListeners(event);
        }
        else {
            this.emitter.removeAllListeners();
        }
        return this;
    }
}
export const defaultEventBus = new PhomEventBus();
