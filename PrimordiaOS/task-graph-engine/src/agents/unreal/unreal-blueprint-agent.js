export const createUnrealBlueprintAgent = (context) => {
    const capability = {
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
