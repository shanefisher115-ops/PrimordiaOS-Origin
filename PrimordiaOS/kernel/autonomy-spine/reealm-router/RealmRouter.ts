// ======================================================
// PRIMORDIAOS — REALM ROUTER
// ======================================================
// Responsibilities:
// - Route tasks to the correct realm
// - Enforce realm boundaries and sovereignty rules
// - Handle agent realm transitions
// - Maintain realm registry
// - Provide deterministic routing for replay
// ======================================================

export interface Realm {
    name: string;
    execute: (task: any, resources: any) => Promise<any>;
}

export class RealmRouter {
    private realms: Map<string, Realm> = new Map();

    constructor() {
        // ------------------------------------------------------
        // REGISTER DEFAULT REALMS
        // ------------------------------------------------------
        this.registerRealm({
            name: "sovereign-realm",
            execute: async (task, resources) => ({
                realm: "sovereign-realm",
                agent: task.agent,
                stateUpdate: {
                    realm: { lastTask: task.id },
                    agent: { lastAction: task.payload }
                },
                output: `Executed in sovereign realm`,
                resources
            })
        });

        this.registerRealm({
            name: "academic-realm",
            execute: async (task, resources) => ({
                realm: "academic-realm",
                agent: task.agent,
                stateUpdate: {
                    realm: { lastTask: task.id },
                    agent: { lastAction: task.payload }
                },
                output: `Executed in academic realm`,
                resources
            })
        });

        this.registerRealm({
            name: "corporate-realm",
            execute: async (task, resources) => ({
                realm: "corporate-realm",
                agent: task.agent,
                stateUpdate: {
                    realm: { lastTask: task.id },
                    agent: { lastAction: task.payload }
                },
                output: `Executed in corporate realm`,
                resources
            })
        });

        this.registerRealm({
            name: "open-realm",
            execute: async (task, resources) => ({
                realm: "open-realm",
                agent: task.agent,
                stateUpdate: {
                    realm: { lastTask: task.id },
                    agent: { lastAction: task.payload }
                },
                output: `Executed in open realm`,
                resources
            })
        });
    }

    // ------------------------------------------------------
    // REGISTER A REALM
    // ------------------------------------------------------
    registerRealm(realm: Realm) {
        this.realms.set(realm.name, realm);
    }

    // ------------------------------------------------------
    // ROUTE TASK TO REALM
    // ------------------------------------------------------
    route(task: any): Realm {
        const realm = this.realms.get(task.realm);
        if (!realm) {
            throw new Error(`Unknown realm: ${task.realm}`);
        }
        return realm;
    }

    // ------------------------------------------------------
    // AGENT REALM TRANSITION
    // ------------------------------------------------------
    transition(agent: any, targetRealm: string) {
        if (!this.realms.has(targetRealm)) {
            throw new Error(`Unknown target realm: ${targetRealm}`);
        }

        return {
            agent,
            from: agent.realm,
            to: targetRealm,
            timestamp: Date.now()
        };
    }

    // ------------------------------------------------------
    // LIST ALL REALMS
    // ------------------------------------------------------
    listRealms(): string[] {
        return Array.from(this.realms.keys());
    }
}
