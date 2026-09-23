// ======================================================
// PRIMORDIAOS — GLOBAL STATE MANAGER
// ======================================================
// The Global State Manager is responsible for:
// - Maintaining deterministic, replay-safe global state
// - Managing realm-scoped and agent-scoped partitions
// - Providing immutable snapshots for deterministic replay
// - Restoring state from snapshots
// - Tracking lineage, ledger, and knowledge graph updates
// - Integrating with the Autonomy Spine event system
// ======================================================

export interface StateSnapshot {
    timestamp: number;
    realms: Record<string, any>;
    agents: Record<string, any>;
    system: Record<string, any>;
}

export class GlobalStateManager {
    private realms: Map<string, any> = new Map();
    private agents: Map<string, any> = new Map();
    private system: Map<string, any> = new Map();

    constructor() {
        // Initialize system-level state
        this.system.set("lastUpdate", Date.now());
        this.system.set("taskCount", 0);
        this.system.set("replayMode", false);
    }

    // ------------------------------------------------------
    // UPDATE STATE AFTER TASK EXECUTION
    // ------------------------------------------------------
    update(result: any) {
        const { realm, agent, stateUpdate } = result;

        // Update realm state
        if (realm) {
            const existingRealmState = this.realms.get(realm) || {};
            this.realms.set(realm, {
                ...existingRealmState,
                ...stateUpdate.realm
            });
        }

        // Update agent state
        if (agent) {
            const existingAgentState = this.agents.get(agent) || {};
            this.agents.set(agent, {
                ...existingAgentState,
                ...stateUpdate.agent
            });
        }

        // Update system state
        this.system.set("lastUpdate", Date.now());
        this.system.set("taskCount", (this.system.get("taskCount") || 0) + 1);
    }

    // ------------------------------------------------------
    // GET REALM STATE
    // ------------------------------------------------------
    getRealmState(realm: string): any {
        return this.realms.get(realm) || {};
    }

    // ------------------------------------------------------
    // GET AGENT STATE
    // ------------------------------------------------------
    getAgentState(agent: string): any {
        return this.agents.get(agent) || {};
    }

    // ------------------------------------------------------
    // GET SYSTEM STATE
    // ------------------------------------------------------
    getSystemState(): any {
        const obj: Record<string, any> = {};
        this.system.forEach((v, k) => (obj[k] = v));
        return obj;
    }

    // ------------------------------------------------------
    // SNAPSHOT (DETERMINISTIC REPLAY)
    // ------------------------------------------------------
    snapshot(): StateSnapshot {
        const realmObj: Record<string, any> = {};
        const agentObj: Record<string, any> = {};
        const systemObj: Record<string, any> = {};

        this.realms.forEach((v, k) => (realmObj[k] = structuredClone(v)));
        this.agents.forEach((v, k) => (agentObj[k] = structuredClone(v)));
        this.system.forEach((v, k) => (systemObj[k] = structuredClone(v)));

        return {
            timestamp: Date.now(),
            realms: realmObj,
            agents: agentObj,
            system: systemObj
        };
    }

    // ------------------------------------------------------
    // RESTORE SNAPSHOT
    // ------------------------------------------------------
    restore(snapshot: StateSnapshot) {
        this.realms.clear();
        this.agents.clear();
        this.system.clear();

        Object.entries(snapshot.realms).forEach(([k, v]) =>
            this.realms.set(k, structuredClone(v))
        );
        Object.entries(snapshot.agents).forEach(([k, v]) =>
            this.agents.set(k, structuredClone(v))
        );
        Object.entries(snapshot.system).forEach(([k, v]) =>
            this.system.set(k, structuredClone(v))
        );

        this.system.set("replayMode", true);
    }

    // ------------------------------------------------------
    // CLEAR ALL STATE (USED BY REPLAY ENGINE)
    // ------------------------------------------------------
    clear() {
        this.realms.clear();
        this.agents.clear();
        this.system.clear();
        this.system.set("replayMode", true);
    }
}
