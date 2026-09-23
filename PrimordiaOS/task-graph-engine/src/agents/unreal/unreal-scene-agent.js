export const createUnrealSceneAgent = (context) => {
    const capability = {
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
