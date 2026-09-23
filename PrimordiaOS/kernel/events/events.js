"use strict";
// Simple event subscription + dispatch system
Object.defineProperty(exports, "__esModule", { value: true });
exports.Events = exports.EventBus = void 0;
class EventBus {
    constructor() {
        this.listeners = new Map();
    }
    on(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(handler);
    }
    dispatch(event, payload) {
        const handlers = this.listeners.get(event);
        if (!handlers)
            return;
        for (const fn of handlers) {
            fn(payload);
        }
    }
}
exports.EventBus = EventBus;
exports.Events = new EventBus();
