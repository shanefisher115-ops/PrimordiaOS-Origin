import { StoreAssetForgePipeline } from "./forge_pipeline";
export * from "./engines/figma_ingest";
export * from "./engines/stitch_extract";
export * from "./engines/mcp_apply";
export * from "./engines/antigravity_render";
export * from "./engines/forge_bundle";
export * from "./forge_pipeline";
export class StoreAssetForgeModule {
    pipeline;
    constructor() {
        this.pipeline = new StoreAssetForgePipeline();
        console.log("[PrimordiaOS] Store Asset Forge Realm Module Loaded");
    }
    async runPipeline(config) {
        return await this.pipeline.run(config);
    }
    auditSovereignty() {
        return this.pipeline.auditSovereignty({ totalAssets: 12 }, { totalRendered: 12 });
    }
    handleTrigger(trigger, payload) {
        return this.pipeline.handleTrigger(trigger, payload);
    }
}
export const StoreAssetForge = new StoreAssetForgeModule();
// Optional Kernel registration if running inside PrimordiaKernel runtime
if (typeof process !== "undefined" && process.env.PRIMORDIA_RUNTIME) {
    import("../../kernel/core/kernel.js").then(({ Kernel }) => {
        if (Kernel && typeof Kernel.registerModule === "function") {
            Kernel.registerModule("store_asset_forge", StoreAssetForge);
        }
    }).catch(() => { });
}
