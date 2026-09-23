import { StoreAssetForgePipeline } from "./forge_pipeline";

export * from "./engines/figma_ingest";
export * from "./engines/stitch_extract";
export * from "./engines/mcp_apply";
export * from "./engines/antigravity_render";
export * from "./engines/forge_bundle";
export * from "./forge_pipeline";

export class StoreAssetForgeModule {
  public pipeline: StoreAssetForgePipeline;

  constructor() {
    this.pipeline = new StoreAssetForgePipeline();
    console.log("[PrimordiaOS] Store Asset Forge Realm Module Loaded");
  }

  public async runPipeline(config?: any) {
    return await this.pipeline.run(config);
  }

  public auditSovereignty() {
    return this.pipeline.auditSovereignty(
      { totalAssets: 12 } as any,
      { totalRendered: 12 } as any
    );
  }

  public handleTrigger(trigger: string, payload?: any) {
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
  }).catch(() => {});
}
