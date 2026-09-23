import { Agent, AgentCapability } from "../agent-types";

export interface UnrealSceneAgentConfig {
  projectPath: string;
}

export interface UnrealSceneAgentContext {
  config: UnrealSceneAgentConfig;
}

export const createUnrealSceneAgent = (
  context: UnrealSceneAgentContext,
): Agent => {
  const capability: AgentCapability = {
    id: "cap-unreal-scene",
    name: "Unreal Scene Capability",
    description: "Spawns or configures scenes in Unreal Engine.",
    supportedTaskNames: ["setup_unreal_scene", "configure_unreal_scene"],
  };

  return {
    id: "agent-unreal-scene",
    name: "UnrealSceneAgent",
    realm: "unreal",
    capabilities: [capability],
  };
};
