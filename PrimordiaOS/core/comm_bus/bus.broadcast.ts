import { CommRegistry } from "./bus.registry";

export function broadcast(fromAgent: string, channel: string, payload: any) {
  const realms = ["windows", "cloud", "termux"];

  realms.forEach(realm => {
    const realmAPI = globalThis.PRIMORDIA_REALM_API[realm];
    realmAPI.broadcast(channel, { from: fromAgent, payload });
  });

  CommRegistry.emit({
    type: "BROADCAST",
    from: fromAgent,
    channel,
    timestamp: Date.now()
  });
}
