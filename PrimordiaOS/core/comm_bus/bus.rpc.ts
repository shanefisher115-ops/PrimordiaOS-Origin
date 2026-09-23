import { RealmAPI } from "./bus.realm_api";
import { CommRegistry } from "./bus.registry";

export async function rpcCall(fromAgent: string, toAgent: string, toRealm: string, method: string, args: any) {
  const rpc = { method, args };

  const result = await RealmAPI[toRealm].sendRPC(toAgent, rpc);

  CommRegistry.emit({
    type: "RPC_CALL",
    from: fromAgent,
    to: toAgent,
    method,
    timestamp: Date.now()
  });

  return result;
}
