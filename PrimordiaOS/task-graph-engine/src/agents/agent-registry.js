export const createAgentRegistry = () => ({
    agents: [],
    register(agent) {
        this.agents.push(agent);
    },
    findForTask(taskName) {
        return this.agents.find(agent => agent.capabilities.some(cap => cap.supportedTaskNames.includes(taskName)));
    },
});
