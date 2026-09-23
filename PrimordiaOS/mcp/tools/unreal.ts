import { MCPTool, MCPToolContext, MCPToolResult } from "./types";

export const createLevel: MCPTool = {
  name: "unreal.create_level",
  description: "Create or load a level based on a scene spec.",
  async run(payload: any, ctx: MCPToolContext): Promise<MCPToolResult> {
    return { success: true, data: { levelName: "GeneratedLevel", jobId: ctx.jobId } };
  },
};

export const spawnActor: MCPTool = {
  name: "unreal.spawn_actor",
  description: "Spawn an actor in the current level.",
  async run(payload: any, ctx: MCPToolContext): Promise<MCPToolResult> {
    return { success: true, data: { actorId: "Actor_001", jobId: ctx.jobId } };
  },
};

export const setupCamera: MCPTool = {
  name: "unreal.setup_camera",
  description: "Configure camera and Sequencer tracks.",
  async run(payload: any, ctx: MCPToolContext): Promise<MCPToolResult> {
    return { success: true, data: { sequenceId: "Seq_001", jobId: ctx.jobId } };
  },
};

export const renderMovie: MCPTool = {
  name: "unreal.render_movie",
  description: "Trigger Movie Render Queue for a sequence.",
  async run(payload: any, ctx: MCPToolContext): Promise<MCPToolResult> {
    return { success: true, data: { outputPath: "/renders/unreal/shot_001.mov" } };
  },
};
