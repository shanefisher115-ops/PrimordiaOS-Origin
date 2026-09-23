import { CommRegistry } from "../comm_bus/bus.registry";

export function attachCommBridge(orchestrator: any) {
  CommRegistry.on(event => {
    orchestrator.handleCommEvent(event);
  });
}
