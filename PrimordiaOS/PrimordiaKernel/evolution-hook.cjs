const fs = require("fs");
const path = require("path");

module.exports = {
  proposeKernelMutation(change) {
    const logPath = path.join("C:\\Users\\Shane\\PrimordiaKernel", "mutations.log");

    const entry = {
      timestamp: new Date().toISOString(),
      change
    };

    fs.appendFileSync(logPath, JSON.stringify(entry, null, 2) + "\\n");
    return { accepted: true, logged: true };
  },

  safeApplyMutation(change) {
    return {
      applied: false,
      reason: "Phase 1: mutation endpoints active, but kernel not yet writable."
    };
  }
};