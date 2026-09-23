/**
 * PrimordiaOS Agent Registry
 * --------------------------
 * Centralized agent loader + lifecycle manager.
 *
 * Agents are simple JS modules that export:
 *   - name
 *   - init()
 *   - shutdown()
 */

const path = require("path");

class AgentRegistry {
  constructor() {
    this.agents = new Map();
  }

  loadAgent(relativePath) {
    try {
      const fullPath = path.join(process.cwd(), relativePath);
      const agentModule = require(fullPath);

      if (!agentModule.name || !agentModule.init) {
        console.error(`❌ Invalid agent at ${relativePath}`);
        return;
      }

      this.agents.set(agentModule.name, agentModule);
      console.log(`→ Agent Loaded: ${agentModule.name}`);
    } catch (err) {
      console.error(`❌ Failed to load agent ${relativePath}:`, err);
    }
  }

  async initAll() {
    for (const [name, agent] of this.agents.entries()) {
      try {
        await agent.init();
        console.log(`→ Agent Initialized: ${name}`);
      } catch (err) {
        console.error(`❌ Agent failed to initialize: ${name}`, err);
      }
    }
  }

  async shutdownAll() {
    for (const [name, agent] of this.agents.entries()) {
      try {
        if (agent.shutdown) {
          await agent.shutdown();
        }
        console.log(`→ Agent Shutdown: ${name}`);
      } catch (err) {
        console.error(`❌ Agent failed to shutdown: ${name}`, err);
      }
    }
  }
}

module.exports = new AgentRegistry();
