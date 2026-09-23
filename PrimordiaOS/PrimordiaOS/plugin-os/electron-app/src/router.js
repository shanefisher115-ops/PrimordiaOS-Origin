const agentCore = require("./agentCore");
const kernel = require("./kernel");
const { BrowserWindow } = require("electron");

const router = require('./router');

  async routeTerminal(commandString) {
    const raw = commandString.trim();
    const lower = raw.toLowerCase();
    const win = BrowserWindow.getAllWindows()[0];

    if (lower.includes("pipeline")) {
      const osmiumReply = await agentCore.run("terminal", { command: commandString });
      if (win) {
        win.webContents.send("pipeline-open");
        win.webContents.send("pipeline-start-engine");
        win.webContents.send("pipeline-log", "Pipeline activated by Osmium.");
      }
      return osmiumReply;
    }

    if (lower.startsWith("mode ")) {
      const mode = lower.split(" ")[1];
      kernel.setMode(mode);
      return `Osmium: Mode transition requested → ${mode}`;
    }

    if (lower.startsWith("field ")) {
      const delta = parseFloat(lower.split(" ")[1]);
      await agentCore.run("antigravity", { fieldStrengthDelta: delta });
      return `Osmium: Field envelope adjusted by ${delta}`;
    }

    if (lower.startsWith("mass ")) {
      const delta = parseFloat(lower.split(" ")[1]);
      await agentCore.run("antigravity", { massDelta: delta });
      return `Osmium: Mass profile shifted by ${delta}`;
    }

    const result = await agentCore.run("terminal", { command: commandString });
    return typeof result === "string" ? result : result.message || "Osmium: Directive executed.";
  }
};
// router.js
const router = {
  init: () => console.log('Router initialized')
};

module.exports = router;


