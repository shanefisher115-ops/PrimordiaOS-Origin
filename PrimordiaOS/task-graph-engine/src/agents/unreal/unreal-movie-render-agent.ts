import { Agent, AgentCapability } from "../agent-types";

export interface UnrealMovieRenderAgentConfig {
  projectPath: string;
}

export interface UnrealMovieRenderAgentContext {
  config: UnrealMovieRenderAgentConfig;
}

export const createUnrealMovieRenderAgent = (
  context: UnrealMovieRenderAgentContext,
): Agent => {
  const capability: AgentCapability = {
    id: "cap-unreal-movie-render",
    name: "Unreal Movie Render Capability",
    description: "Renders cinematic sequences via Unreal Movie Render Pipeline.",
    supportedTaskNames: ["render_unreal_movie", "render_unreal_sequence"],
  };

  return {
    id: "agent-unreal-movie-render",
    name: "UnrealMovieRenderAgent",
    realm: "unreal",
    capabilities: [capability],
  };
};
