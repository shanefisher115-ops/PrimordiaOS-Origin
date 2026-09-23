import { Kernel } from "../../kernel/core/kernel.js";
export class PhysicsModule {
    constructor() {
        console.log("[PrimordiaOS] Physics Module Loaded");
    }
    applyForce(entityId, vector) {
        Kernel.emit("physics.force", { entityId, vector });
    }
    syncState(state) {
        Kernel.emit("physics.sync", { state });
    }
}
export const Physics = new PhysicsModule();
Kernel.registerModule("physics", Physics);
