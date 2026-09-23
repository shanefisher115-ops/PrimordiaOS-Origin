import { Kernel } from "../../kernel/core/kernel.js";
export class PipelineModule {
    constructor() {
        console.log("[PrimordiaOS] Pipeline Module Loaded");
    }
    sync(data) {
        Kernel.emit("pipeline.sync", { data });
    }
    export(type, payload) {
        Kernel.emit("pipeline.export", { type, payload });
    }
}
export const Pipeline = new PipelineModule();
Kernel.registerModule("pipeline", Pipeline);
