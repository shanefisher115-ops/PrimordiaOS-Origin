import { ClaimRegistry } from "../task_claiming/claiming.registry";

export function attachClaimingBridge(orchestrator: any) {
  ClaimRegistry.on(event => {
    orchestrator.handleClaimEvent(event);
  });
}
