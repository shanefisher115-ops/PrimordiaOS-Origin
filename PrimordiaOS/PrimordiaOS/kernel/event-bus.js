import { EventEmitter } from "node:events";

/**
 * High-throughput asynchronous event broker connecting all 5 PrimordiaOS realms.
 */
export class UniversalEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
    this.history = [];
    this.maxHistory = 1000;
  }

  /**
   * Override emit to ensure wildcard listeners receive all events
   */
  emit(eventName, ...args) {
    const res = super.emit(eventName, ...args);
    if (eventName !== "*") {
      let payload = args[0] !== undefined ? args[0] : {};
      if (typeof payload === "object" && payload !== null && !payload.type) {
        payload = { ...payload, type: eventName, name: eventName };
      }
      super.emit("*", payload);
    }
    return res;
  }

  /**
   * Broadcast an event across all subscribed realms.
   * @param {string} eventName 
   * @param {object} payload 
   * @param {string} sourceRealm 
   */
  emitRealmEvent(eventName, payload = {}, sourceRealm = "local_realm") {
    const eventRecord = {
      ...(typeof payload === "object" && payload !== null ? payload : {}),
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: eventName,
      type: eventName,
      source_realm: sourceRealm,
      timestamp: Date.now(),
      iso: new Date().toISOString(),
      payload,
      data: payload
    };

    this.history.push(eventRecord);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Emit event name (which automatically forwards to wildcard via emit override)
    this.emit(eventName, eventRecord);
    return eventRecord;
  }

  /**
   * Returns recent events, optionally filtered by realm.
   * @param {string} [realm] 
   * @param {number} [limit=50] 
   */
  getRecentEvents(realm = null, limit = 50) {
    if (realm) {
      return this.history.filter(e => e.source_realm === realm).slice(-limit);
    }
    return this.history.slice(-limit);
  }
}

export const eventBus = new UniversalEventBus();
