import { GovernanceRegistry } from "../governance/governance.registry";

export function attachGovernanceBridge(orchestrator: any) {
  GovernanceRegistry.on(event => {
    orchestrator.handleGovernance(event);
  });
}
