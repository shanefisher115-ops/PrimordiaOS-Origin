import { FaultRegistry } from "../fault_tolerance/fault.registry";

export function attachFaultBridge(orchestrator: any) {
  FaultRegistry.on(event => {
    orchestrator.handleFault(event);
  });
}
