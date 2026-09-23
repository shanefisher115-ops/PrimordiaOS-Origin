import { Agent, AgentCapability } from "../agent-types";

export interface UnrealBlueprintAgentConfig {
  projectPath: string;
}

export interface UnrealBlueprintAgentContext {
  config: UnrealBlueprintAgentConfig;
}

export const createUnrealBlueprintAgent = (
  context: UnrealBlueprintAgentContext,
): Agent => {
  const capability: AgentCapability = {
    id: "cap-unreal-blueprint",
    name: "Unreal Blueprint Capability",
    description: "Modifies or triggers Unreal Blueprints.",
    supportedTaskNames: ["run_unreal_blueprint", "modify_unreal_blueprint"],
  };

  return {
    id: "agent-unreal-blueprint",
    name: "UnrealBlueprintAgent",
    realm: "unreal",
    capabilities: [capability],
  };
};
