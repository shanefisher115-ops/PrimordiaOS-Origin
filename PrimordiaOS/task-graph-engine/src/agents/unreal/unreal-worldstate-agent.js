export const createUnrealWorldStateAgent = (context) => {
    const capability = {
        id: "cap-unreal-worldstate",
        name: "Unreal World State Capability",
        description: "Reads or exports world state from Unreal scenes.",
        supportedTaskNames: ["read_unreal_worldstate", "export_unreal_worldstate"],
    };
    return {
        id: "agent-unreal-worldstate",
        name: "UnrealWorldStateAgent",
        realm: "unreal",
        capabilities: [capability],
    };
};
