// ======================================================
// PRIMORDIAOS — AUTONOMY SPINE (MASTER ORCHESTRATOR)
// ======================================================

import { SovereignScheduler } from "./scheduler/SovereignScheduler";
import { GlobalStateManager } from "./global-state/GlobalStateManager";
import { SafetyGovernor } from "./governor/SafetyGovernor";
import { ResourceAllocator } from "./allocator/ResourceAllocator";
import { EventBus } from "./event-bus/EventBus";
import { RealmRouter } from "./realm-router/RealmRouter";
import { EvolutionEngine } from "./evolution/EvolutionEngine";

export class AutonomySpine {
    scheduler: SovereignScheduler;
    state: GlobalStateManager;
    governor: SafetyGovernor;
    allocator: ResourceAllocator;
    bus: EventBus;
    router: RealmRouter;
    evolution: EvolutionEngine;

    constructor() {
        this.scheduler = new SovereignScheduler();
        this.state = new GlobalStateManager();
        this.governor = new SafetyGovernor();
        this.allocator = new ResourceAllocator();
        this.bus = new EventBus();
        this.router = new RealmRouter();
        this.evolution = new EvolutionEngine();
    }

    // ------------------------------------------------------
    // MAIN ENTRYPOINT — ALL TASKS FLOW THROUGH THIS METHOD
    // ------------------------------------------------------
    async submitTask(task: any) {
        // 1. Validate task via Safety Governor
        const validated = this.governor.validate(task);
        this.bus.emit("TASK_VALIDATED", { task: validated });

        // 2. Schedule task via Sovereign Scheduler
        const scheduled = this.scheduler.schedule(validated);
        this.bus.emit("TASK_SCHEDULED", { task: scheduled });

        // 3. Allocate deterministic resources
        const resources = this.allocator.allocate(scheduled);
        this.bus.emit("RESOURCES_ALLOCATED", { task: scheduled, resources });

        // 4. Route task to correct realm
        const realm = this.router.route(scheduled);
        this.bus.emit("TASK_ROUTED", { task: scheduled, realm });

        // 5. Execute task inside the realm
        const result = await realm.execute(scheduled, resources);
        this.bus.emit("TASK_EXECUTED", { task: scheduled, result });

        // 6. Update global state
        this.state.update(result);
        this.bus.emit("STATE_UPDATED", { result });

        // 7. Feed result into Evolution Engine
        this.evolution.learn(result);
        this.bus.emit("EVOLUTION_LEARNED", { result });

        // 8. Return final result
        return result;
    }

    // ------------------------------------------------------
    // REALM TRANSITION API
    // ------------------------------------------------------
    async transitionAgent(agent: any, targetRealm: string) {
        const validated = this.governor.validateTransition(agent, targetRealm);
        this.bus.emit("REALM_TRANSITION_VALIDATED", { agent, targetRealm });

        const routed = this.router.transition(agent, targetRealm);
        this.bus.emit("REALM_TRANSITION_ROUTED", { agent, targetRealm });

        return routed;
    }

    // ------------------------------------------------------
    // SYSTEM EVENT API
    // ------------------------------------------------------
    emitSystemEvent(eventType: string, payload: any) {
        this.bus.emit(eventType, payload);
    }

    // ------------------------------------------------------
    // SNAPSHOT API (DETERMINISTIC REPLAY)
    // ------------------------------------------------------
    snapshot() {
        return this.state.snapshot();
    }

    restore(snapshot: any) {
        this.state.restore(snapshot);
        this.bus.emit("STATE_RESTORED", { snapshot });
    }
}
