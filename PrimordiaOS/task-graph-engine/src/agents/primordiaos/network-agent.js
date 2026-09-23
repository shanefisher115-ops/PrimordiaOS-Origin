export const createNetworkAgent = (context) => {
    const capability = {
        id: "cap-network",
        name: "Network Capability",
        description: "Performs HTTP requests from PrimordiaOS.",
        supportedTaskNames: ["http_get", "http_post"],
    };
    return {
        id: "agent-network",
        name: "NetworkAgent",
        realm: "primordiaos",
        capabilities: [capability],
    };
};
