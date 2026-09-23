// realms/realm.ts
// PrimordiaOS Realm Definition — full implementation
// A Realm is an isolated universe with its own state, agents, pipelines, and event space.

import { eventBus } from "../primordia-core/shared/event-bus";

export interface RealmConfig {
    id: string;
    name: string;
    description?: string;
}

export class Realm {
    id: string;
    name: string;
    description: string;
    private localBus: Map<string, Function[]>;

    constructor(config: RealmConfig) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description || "";
        this.localBus = new Map();
    }

    emit(topic: string, payload: any) {
        const handlers = this.localBus.get(topic) || [];
        handlers.forEach(h => h(payload));

        // Also emit globally with realm metadata
        eventBus.emit(`realm.${this.id}.${topic}`, payload, this.id);
    }

    on(topic: string, handler: Function) {
        const handlers = this.localBus.get(topic) || [];
        handlers.push(handler);
        this.localBus.set(topic, handlers);
    }
}
