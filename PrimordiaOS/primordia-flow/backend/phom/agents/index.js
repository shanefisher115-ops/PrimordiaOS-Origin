/**
 * ==============================================================================
 * ⭐ LAYER 8: AGENT SWARM MASTER EXPORTS
 * The 11 discrete Node modules of the full autonomous PHOM Swarm:
 * 1. discoveryAgent
 * 2. scoringAgent
 * 3. personaAgent
 * 4. outboundAgent
 * 5. distributorAgent
 * 6. analyticsAgent
 * 7. orchestratorAgent
 * 8. memoryAgent
 * 9. heatDriftAgent
 * 10. personaEvolutionAgent
 * 11. dealCloserAgent
 * ==============================================================================
 */
export { discoveryAgent, run as runDiscoveryAgent } from './discoveryAgent';
export { scoringAgent, run as runScoringAgent } from './scoringAgent';
export { personaAgent, run as runPersonaAgent } from './personaAgent';
export { outboundAgent, run as runOutboundAgent } from './outboundAgent';
export { distributorAgent, run as runDistributorAgent } from './distributorAgent';
export { analyticsAgent, run as runAnalyticsAgent } from './analyticsAgent';
export { orchestratorAgent, run as runOrchestratorAgent } from './orchestratorAgent';
export { memoryAgent, run as runMemoryAgent } from './memoryAgent';
export { heatDriftAgent, run as runHeatDriftAgent } from './heatDriftAgent';
export { personaEvolutionAgent, run as runPersonaEvolutionAgent } from './personaEvolutionAgent';
export { dealCloserAgent, run as runDealCloserAgent } from './dealCloserAgent';
import { discoveryAgent } from './discoveryAgent';
import { scoringAgent } from './scoringAgent';
import { personaAgent } from './personaAgent';
import { outboundAgent } from './outboundAgent';
import { distributorAgent } from './distributorAgent';
import { analyticsAgent } from './analyticsAgent';
import { orchestratorAgent } from './orchestratorAgent';
import { memoryAgent } from './memoryAgent';
import { heatDriftAgent } from './heatDriftAgent';
import { personaEvolutionAgent } from './personaEvolutionAgent';
import { dealCloserAgent } from './dealCloserAgent';
export const agentSwarm = {
    discoveryAgent,
    scoringAgent,
    personaAgent,
    outboundAgent,
    distributorAgent,
    analyticsAgent,
    orchestratorAgent,
    memoryAgent,
    heatDriftAgent,
    personaEvolutionAgent,
    dealCloserAgent
};
export default agentSwarm;
