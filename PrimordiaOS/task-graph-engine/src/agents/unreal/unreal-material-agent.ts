import { Agent, AgentCapability } from "../agent-types";

export interface UnrealMaterialAgentConfig {
  projectPath: string;
}

export interface UnrealMaterialAgentContext {
  config: UnrealMaterialAgentConfig;
}

export const createUnrealMaterialAgent = (
  context: UnrealMaterialAgentContext,
): Agent => {
  const capability: AgentCapability = {
    id: "cap-unreal-material",
    name: "Unreal Material Capability",
    description: "Applies or modifies materials in Unreal scenes.",
    supportedTaskNames: ["apply_unreal_material", "modify_unreal_material"],
  };

  return {
    id: "agent-unreal-material",
    name: "UnrealMaterialAgent",
    realm: "unreal",
    capabilities: [capability],
  };
};
