import { UEEvents } from "./ue-events.js";
import { UEState } from "./ue-state.js";

export class UnrealBridgeClient {
  constructor(endpoint = "ws://127.0.0.1:8889/primordiaos") {
    this.endpoint = endpoint;
    this.connected = false;
    this.listeners = new Map();
    this.socket = null;
  }
  connect() {
    this.connected = true;
    UEState.status.connected = true;
  }
  send(event, payload = {}) {
    console.log(`[UE Bridge ? Unreal] ${event}:`, payload);
  }
  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(handler);
  }
  emit(event, payload) {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach(h => h(payload));
  }
}

export const UEBridge = new UnrealBridgeClient();
