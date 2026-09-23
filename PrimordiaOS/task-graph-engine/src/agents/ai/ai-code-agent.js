export const createAICodeAgent = (context) => {
    const capability = {
        id: "cap-ai-code",
        name: "AI Code Capability",
        description: "Generates or modifies code using AI.",
        supportedTaskNames: ["ai_generate_code", "ai_modify_code"],
    };
    return {
        id: "agent-ai-code",
        name: "AICodeAgent",
        realm: "ai-core",
        capabilities: [capability],
    };
};
