export const createAIAnalysisAgent = (context) => {
    const capability = {
        id: "cap-ai-analysis",
        name: "AI Analysis Capability",
        description: "Performs reasoning, analysis, and structured interpretation.",
        supportedTaskNames: ["ai_analyze", "ai_reason"],
    };
    return {
        id: "agent-ai-analysis",
        name: "AIAnalysisAgent",
        realm: "ai-core",
        capabilities: [capability],
    };
};
