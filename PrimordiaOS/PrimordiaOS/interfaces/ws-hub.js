import { eventBus } from "../kernel/event-bus.js";

/**
 * WebSocket Multiplexer Hub for PrimordiaOS Interfaces.
 */
export class WebSocketHub {
  constructor() {
    this.channels = new Map();
  }

  subscribe(channelName, callback) {
    if (!this.channels.has(channelName)) {
      this.channels.set(channelName, new Set());
    }
    this.channels.get(channelName).add(callback);
    return () => this.channels.get(channelName).delete(callback);
  }

  broadcast(channelName, data) {
    if (this.channels.has(channelName)) {
      for (const cb of this.channels.get(channelName)) {
        cb(data);
      }
    }
  }
}

export const wsHub = new WebSocketHub();
