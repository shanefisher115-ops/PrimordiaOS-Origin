import { RealmAPI } from "./bus.realm_api";
import { CommRegistry } from "./bus.registry";
import config from "./bus.config.json";

export function routeMessage(fromAgent: string, toAgent: string, payload: any, toRealm: string) {
  const sizeKB = JSON.stringify(payload).length / 1024;

  if (sizeKB > config.maxMessageSizeKB) return;

  RealmAPI[toRealm].sendMessage(toAgent, {
    from: fromAgent,
    payload
  });

  CommRegistry.emit({
    type: "MESSAGE_SENT",
    from: fromAgent,
    to: toAgent,
    sizeKB,
    timestamp: Date.now()
  });
}
