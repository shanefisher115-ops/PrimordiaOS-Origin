export const createUnrealMovieRenderAgent = (context) => {
    const capability = {
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
