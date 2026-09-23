import { eventBus } from "../core/eventBus.js";

export class RealmEvents {
  dispatchRealmShift(targetRealm: string): void {
    eventBus.emit("realm:shift", { target: targetRealm, timestamp: Date.now() });
  }
}