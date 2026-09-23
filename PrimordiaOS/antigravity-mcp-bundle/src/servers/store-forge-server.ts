import { StoreAssetForgePipeline } from "../../../modules/forge/forge_pipeline";
import { FigmaIngestEngine } from "../../../modules/forge/engines/figma_ingest";
import { StitchExtractEngine } from "../../../modules/forge/engines/stitch_extract";
import { McpApplyEngine } from "../../../modules/forge/engines/mcp_apply";
import { AntigravityRenderEngine } from "../../../modules/forge/engines/antigravity_render";
import { ForgeBundleEngine } from "../../../modules/forge/engines/forge_bundle";

const pipeline = new StoreAssetForgePipeline();
const figmaEngine = new FigmaIngestEngine();
const stitchEngine = new StitchExtractEngine();
const mcpEngine = new McpApplyEngine();
const antigravityEngine = new AntigravityRenderEngine();
const bundleEngine = new ForgeBundleEngine();

export const runPipelineTool = {
  name: "storeForge.runPipeline",
  description: "Executes the 5-stage Store Asset Forge pipeline (Figma -> Stitch -> MCP -> Antigravity -> Bundle)",
  inputSchema: {
    type: "object",
    properties: {
      figmaSourcePath: { type: "string", description: "Path to Figma JSON or source file" },
      stitchManifestPath: { type: "string", description: "Path to stitch UI manifest" },
      mcpSpecPath: { type: "string", description: "Path to MCP store specs" },
      antigravityProfilePath: { type: "string", description: "Path to Antigravity cinematic profile" },
      outputDir: { type: "string", description: "Base output directory" }
    }
  },
  outputSchema: { type: "object" },
  execute: async (input: any) => {
    return await pipeline.run(input || {});
  }
};

export const ingestFigmaTool = {
  name: "storeForge.ingestFigma",
  description: "Extract frames, layout metadata, and components from Figma source",
  inputSchema: {
    type: "object",
    properties: {
      figmaSourcePath: { type: "string" }
    },
    required: ["figmaSourcePath"]
  },
  outputSchema: { type: "object" },
  execute: async (input: any) => {
    return await figmaEngine.ingest(input.figmaSourcePath);
  }
};

export const extractStitchTool = {
  name: "storeForge.extractStitch",
  description: "Parse UI tokens, typography, hierarchy, and component definitions",
  inputSchema: {
    type: "object",
    properties: {
      figmaResult: { type: "object" },
      stitchManifestPath: { type: "string" }
    },
    required: ["figmaResult", "stitchManifestPath"]
  },
  outputSchema: { type: "object" },
  execute: async (input: any) => {
    return await stitchEngine.extract(input.figmaResult, input.stitchManifestPath);
  }
};

export const applySpecsTool = {
  name: "storeForge.applySpecs",
  description: "Apply platform-specific store specifications (App Store, Google Play, Windows Store)",
  inputSchema: {
    type: "object",
    properties: {
      uiMetadata: { type: "object" },
      mcpSpecPath: { type: "string" }
    },
    required: ["uiMetadata", "mcpSpecPath"]
  },
  outputSchema: { type: "object" },
  execute: async (input: any) => {
    return await mcpEngine.applySpecs(input.uiMetadata, input.mcpSpecPath);
  }
};

export const renderAntigravityTool = {
  name: "storeForge.renderAntigravity",
  description: "Generate cinematic assets using Antigravity AI rendering & mythic overlays",
  inputSchema: {
    type: "object",
    properties: {
      specs: { type: "object" },
      profilePath: { type: "string" },
      outputBaseDir: { type: "string" }
    },
    required: ["specs", "profilePath"]
  },
  outputSchema: { type: "object" },
  execute: async (input: any) => {
    return await antigravityEngine.render(input.specs, input.profilePath, input.outputBaseDir || "./out");
  }
};

export const bundleAssetsTool = {
  name: "storeForge.bundleAssets",
  description: "Package rendered assets into unified release bundle archive & manifest",
  inputSchema: {
    type: "object",
    properties: {
      renderResult: { type: "object" },
      outputBaseDir: { type: "string" }
    },
    required: ["renderResult"]
  },
  outputSchema: { type: "object" },
  execute: async (input: any) => {
    return await bundleEngine.bundle(input.renderResult, input.outputBaseDir || "./out");
  }
};

export const auditSovereigntyTool = {
  name: "storeForge.auditSovereignty",
  description: "Evaluates ANTIGRAV() anti-collapse and sovereignty scores for generated asset bundles",
  inputSchema: {
    type: "object",
    properties: {
      bundleManifest: { type: "object" },
      renderResult: { type: "object" }
    }
  },
  outputSchema: { type: "object" },
  execute: async (input: any) => {
    return pipeline.auditSovereignty(
      input.bundleManifest || ({ totalAssets: 12 } as any),
      input.renderResult || ({ totalRendered: 12 } as any)
    );
  }
};

export default [
  runPipelineTool,
  ingestFigmaTool,
  extractStitchTool,
  applySpecsTool,
  renderAntigravityTool,
  bundleAssetsTool,
  auditSovereigntyTool
];
