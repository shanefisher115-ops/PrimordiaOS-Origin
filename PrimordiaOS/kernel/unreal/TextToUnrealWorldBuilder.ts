// ======================================================
// TEXT → UNREAL WORLD BUILDER (HYBRID)
// ======================================================

import { UnrealWorldRealm } from "./UnrealWorldRealm";

export class TextToUnrealWorldBuilder {
    private realm = new UnrealWorldRealm();

    async build(text: string, agent: string) {
        const task = {
            id: "world-" + Math.random().toString(36).substring(2, 10),
            agent,
            realm: this.realm.name,
            payload: text,
            sovereignty: "high",
            risk: 2,
            lineage: [{ source: agent, timestamp: Date.now(), weight: 1 }],
            timestamp: Date.now()
        };

        const resources = { seed: task.id.length * 31 };

        return this.realm.execute(task, resources);
    }
}
