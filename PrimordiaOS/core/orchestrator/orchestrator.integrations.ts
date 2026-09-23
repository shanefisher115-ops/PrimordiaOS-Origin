import { FaultRegistry } from "../fault_tolerance/fault.registry";
import { GovernanceRegistry } from "../governance/governance.registry";

export function attachOrchestratorIntegrations(orchestrator: any) {
  FaultRegistry.on(event => orchestrator.handleFault(event));
  GovernanceRegistry.on(event => orchestrator.handleGovernance(event));
}
