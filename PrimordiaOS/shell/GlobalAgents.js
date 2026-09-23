import { GlobalTimeline } from "./GlobalTimeline.js";

export const GlobalAgents = {
  dispatch(agentName, payload = {}) {
    const os = typeof window !== "undefined" ? window.PrimordiaOS : null;
    if (!os || !Array.isArray(os.agents)) return;

    const agent = os.agents.find(a => a.name.toLowerCase() === agentName.toLowerCase());
    if (!agent) {
      console.warn(`?? [Global Agents] Target agent [${agentName}] not found.`);
      return;
    }

    if (!Array.isArray(agent.tasks)) agent.tasks = [];
    const taskEntry = {
      timestamp: Date.now(),
      description: payload.description || payload.task || "Autonomous cognitive execution"
    };
    agent.tasks.push(taskEntry);

    GlobalTimeline.write({
      type: "agent",
      title: `${agent.name} Task Execution`,
      summary: taskEntry.description,
      data: payload,
      icon: agent.avatar || "??"
    });

    console.log(`?? [Global Agents] Dispatched task to [${agent.name}]: ${taskEntry.description}`);
  }
};
