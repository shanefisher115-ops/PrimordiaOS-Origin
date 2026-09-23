const { BrowserWindow } = require('electron');
const agentCore = require('./agentCore');

class CommandRouter {
  constructor() {
    this.handlers = {};
  }

  register(type, handler) {
    if (!this.handlers[type]) this.handlers[type] = [];
    this.handlers[type].push(handler);
  }

  async route(cmd) {
    const list = this.handlers[cmd.type] || [];
    for (const h of list) {
      await h(cmd);
    }
  }
}

const router = new CommandRouter();

router.register('RUN_AGENT', async ({ payload }) => {
  const { agent, data } = payload;
  const result = await agentCore.run(agent, data);

  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    win.webContents.send('ui-update', result.telemetry || {});
  }
});

module.exports = router;
