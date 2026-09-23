// realms/realmEventTriggers.ts
import { creatorRealm } from "./creator/creatorRealmAdapter";
import { monetizationRealm } from "./monetization/monetizationRealmAdapter";
import { simulationRealm } from "./simulation/simulationRealmAdapter";
import { workflowRealm } from "./workflow/workflowRealmAdapter";
import { autonomyRealm } from "./autonomy/autonomyRealmAdapter";
export const realmEvents = {
    // ---------------------------------------------------------
    // CREATOR REALM
    // ---------------------------------------------------------
    triggerCreatorEvent(type, payload) {
        creatorRealm.emitContentEvent(type, payload);
        return {
            realm: "creator",
            type,
            payload,
            timestamp: Date.now(),
        };
    },
    // ---------------------------------------------------------
    // MONETIZATION REALM
    // ---------------------------------------------------------
    triggerRevenue(amount, source) {
        monetizationRealm.recordRevenue(amount, source);
        return {
            realm: "monetization",
            type: "revenue",
            amount,
            source,
            timestamp: Date.now(),
        };
    },
    triggerConversion(rate) {
        monetizationRealm.recordConversion(rate);
        return {
            realm: "monetization",
            type: "conversion",
            rate,
            timestamp: Date.now(),
        };
    },
    // ---------------------------------------------------------
    // SIMULATION REALM
    // ---------------------------------------------------------
    triggerSimulationResult(result) {
        simulationRealm.recordSimulationResult(result);
        return {
            realm: "simulation",
            type: "simulation-result",
            result,
            timestamp: Date.now(),
        };
    },
    triggerPhysicsEvent(event) {
        simulationRealm.recordPhysicsEvent(event);
        return {
            realm: "simulation",
            type: "physics-event",
            event,
            timestamp: Date.now(),
        };
    },
    // ---------------------------------------------------------
    // WORKFLOW REALM
    // ---------------------------------------------------------
    triggerTaskCompletion(taskId, durationMs) {
        workflowRealm.recordTaskCompletion(taskId, durationMs);
        return {
            realm: "workflow",
            type: "task-completion",
            taskId,
            durationMs,
            timestamp: Date.now(),
        };
    },
    triggerPipelineEvent(event) {
        workflowRealm.recordPipelineEvent(event);
        return {
            realm: "workflow",
            type: "pipeline-event",
            event,
            timestamp: Date.now(),
        };
    },
    // ---------------------------------------------------------
    // AUTONOMY REALM
    // ---------------------------------------------------------
    triggerAutonomyShift(delta) {
        autonomyRealm.recordAutonomyShift(delta);
        return {
            realm: "autonomy",
            type: "autonomy-shift",
            delta,
            timestamp: Date.now(),
        };
    },
    triggerAgentEvolution(agentId, change) {
        autonomyRealm.recordAgentEvolution(agentId, change);
        return {
            realm: "autonomy",
            type: "agent-evolution",
            agentId,
            change,
            timestamp: Date.now(),
        };
    },
};
