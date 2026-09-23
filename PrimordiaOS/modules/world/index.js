import { Kernel } from "../../kernel/core/kernel.js";
export class WorldModule {
    constructor() {
        console.log("[PrimordiaOS] World Module Loaded");
    }
    spawn(entityType, params = {}) {
        Kernel.emit("world.spawn", { entityType, params });
    }
    destroy(entityId) {
        Kernel.emit("world.destroy", { entityId });
    }
    update(entityId, data) {
        Kernel.emit("world.update", { entityId, data });
    }
}
export const World = new WorldModule();
Kernel.registerModule("world", World);
