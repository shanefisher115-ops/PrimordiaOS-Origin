export const createAIMemoryAgent = (context) => {
    const capability = {
        id: "cap-ai-memory",
        name: "AI Memory Capability",
        description: "Stores and retrieves long-term AI memory.",
        supportedTaskNames: ["ai_memory_store", "ai_memory_retrieve"],
    };
    return {
        id: "agent-ai-memory",
        name: "AIMemoryAgent",
        realm: "ai-core",
        capabilities: [capability],
    };
};
