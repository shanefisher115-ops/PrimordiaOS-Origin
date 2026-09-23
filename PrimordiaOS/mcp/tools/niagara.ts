import { MCPTool, MCPToolContext, MCPToolResult } from "./types";

export const configureNiagara: MCPTool = {
  name: "niagara.configure_effect",
  description: "Configure a Niagara system for a scene.",
  async run(payload: any, ctx: MCPToolContext): Promise<MCPToolResult> {
    return { success: true, data: { effectId: payload.effectId, jobId: ctx.jobId } };
  },
};
