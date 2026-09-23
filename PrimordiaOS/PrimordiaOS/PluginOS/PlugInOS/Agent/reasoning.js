// agent/reasoning.js
export const reasoning = {
  async decide(perceived, memory) {
    const { type, payload } = perceived;

    switch (type) {
      case "balance_update":
        return {
          actions: ["updateBalance"],
          payload
        };

      case "intel_update":
        return {
          actions: ["writeIntel", "updateOpportunities"],
          payload
        };

      case "os_signal":
        return {
          actions: ["triggerLoop"],
          payload
        };

      default:
        return { actions: [], payload };
    }
  }
};
This is pure logic — no memory stored inside the agent.

⭐ 5. ACTION MODULES (Modular, Replaceable, Independent)
Each action is its own function.

js
// agent/actions.js
export const actions = {
  async updateBalance(payload, memory) {
    return await memory.write("balances", payload);
  },

  async updateOpportunities(payload, memory) {
    return await memory.write("opportunities", payload);
  },

  async updateEarnings(payload, memory) {
    return await memory.write("earnings_history", payload);
  },

  async writeIntel(payload, memory) {
    return await memory.write("intel_feed", payload);
  },

  async triggerLoop(payload, memory) {
    return await memory.write("system_events", {
      event: "loop_triggered",
      payload,
      timestamp: Date.now()
    });
  }
};