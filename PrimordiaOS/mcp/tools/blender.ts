import { MCPTool, MCPToolContext, MCPToolResult } from "./types";

export const importAsset: MCPTool = {
  name: "blender.import_asset",
  description: "Import an asset or rendered clip into Blender.",
  async run(payload: any, ctx: MCPToolContext): Promise<MCPToolResult> {
    return { success: true, data: { importedPath: payload.path, jobId: ctx.jobId } };
  },
};

export const setupScene: MCPTool = {
  name: "blender.setup_scene",
  description: "Configure Blender scene from a scene spec.",
  async run(payload: any, ctx: MCPToolContext): Promise<MCPToolResult> {
    return { success: true, data: { sceneId: "BlenderScene_001", jobId: ctx.jobId } };
  },
};

export const renderBlender: MCPTool = {
  name: "blender.render",
  description: "Render final pass from Blender.",
  async run(payload: any, ctx: MCPToolContext): Promise<MCPToolResult> {
    return { success: true, data: { outputPath: "/renders/blender/final_001.exr" } };
  },
};
