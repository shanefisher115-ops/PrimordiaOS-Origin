export const createAIPromptAgent = (context) => {
    const capability = {
        id: "cap-ai-prompt",
        name: "AI Prompt Capability",
        description: "Generates prompts for other AI agents.",
        supportedTaskNames: ["ai_generate_prompt"],
    };
    return {
        id: "agent-ai-prompt",
        name: "AIPromptAgent",
        realm: "ai-core",
        capabilities: [capability],
    };
};
