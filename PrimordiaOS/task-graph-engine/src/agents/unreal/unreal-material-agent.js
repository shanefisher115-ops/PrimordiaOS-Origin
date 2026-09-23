export const createUnrealMaterialAgent = (context) => {
    const capability = {
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
