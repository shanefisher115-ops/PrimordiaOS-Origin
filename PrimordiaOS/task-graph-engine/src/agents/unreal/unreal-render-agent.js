export const createUnrealRenderAgent = (context) => {
    const capability = {
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
