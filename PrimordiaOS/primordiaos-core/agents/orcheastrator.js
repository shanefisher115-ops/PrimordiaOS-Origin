// primordiaos-core/agents/orchestrator.js

// Simple in‑memory agent registry
const agents = new Map();

// Spawn a new agent
export async function spawnAgent(metadata = {}) {
  const id = `agent_${Date.now()}`;
  const agent = {
    id,
    state: "initialized",
    metadata,
    createdAt: new Date()
  };

  agents.set(id, agent);

  console.log(`🤖 Agent spawned: ${id}`);
  console.log("Metadata:", metadata);

  // Optional: auto‑run agent behavior
  await runAgent(agent);

  return agent;
}

// Agent behavior loop (stub)
export async function runAgent(agent) {
  console.log(`🔁 Running agent behavior: ${agent.id}`);

  // Example behavior
  agent.state = "active";

  console.log(`⚡ Agent ${agent.id} is active.`);
}

// Get agent by ID
export function getAgent(id) {
  return agents.get(id);
}

// List all agents
export function listAgents() {
  return Array.from(agents.values());
}
