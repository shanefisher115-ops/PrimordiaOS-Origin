import { Kernel } from "../../kernel/core/kernel.js";
export class AIModule {
    constructor() {
        console.log("[PrimordiaOS] AI Module Loaded");
    }
    think(entityId, context) {
        Kernel.emit("ai.think", { entityId, context });
    }
    decide(entityId, decision) {
        Kernel.emit("ai.decision", { entityId, decision });
    }
}
export const AI = new AIModule();
Kernel.registerModule("ai", AI);
