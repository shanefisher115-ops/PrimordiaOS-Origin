export const createAICoreAgent = (context) => {
    const capability = {
        id: "cap-ai-core",
        name: "AI Core Capability",
        description: "General-purpose AI reasoning and text generation.",
        supportedTaskNames: ["ai_core_generate", "ai_core_chat"],
    };
    return {
        id: "agent-ai-core",
        name: "AICoreAgent",
        realm: "ai-core",
        capabilities: [capability],
    };
};
