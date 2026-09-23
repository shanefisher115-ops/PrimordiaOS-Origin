module.exports = {
  name: "DevTools Agent",

  async init() {
    console.log("[DevTools] Ready");
  },

  async shutdown() {
    console.log("[DevTools] Shutdown");
  }
};
