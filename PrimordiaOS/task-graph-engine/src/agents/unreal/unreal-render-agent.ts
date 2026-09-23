import { Agent, AgentCapability } from "../agent-types";

export interface UnrealRenderAgentConfig {
  projectPath: string;
}

export interface UnrealRenderAgentContext {
  config: UnrealRenderAgentConfig;
}

export const createUnrealRenderAgent = (
  context: UnrealRenderAgentContext,
): Agent => {
  const capability: AgentCapability = {
    id: "cap-unreal-render",
    name: "Unreal Render Capability",
    description: "Renders static scenes or frames inside Unreal Engine.",
    supportedTaskNames: ["render_unreal_scene", "render_unreal_scenes"],
  };

  return {
    id: "agent-unreal-render",
    name: "UnrealRenderAgent",
    realm: "unreal",
    capabilities: [capability],
  };
};
