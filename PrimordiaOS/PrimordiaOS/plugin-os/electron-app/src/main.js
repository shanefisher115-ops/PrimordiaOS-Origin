// ======================================================
// PRIMORDIAL ORIGIN · MASTER MAIN.JS
// Cosmic Cockpit Entry Point
// ======================================================

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const router = require('./router');
router.init();
const kernel = require("./kernel");
const agentCore = require("./agentCore");

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 950,
    x: 100,
    y: 100,
    backgroundColor: "#000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.loadFile(path.join(__dirname, "index.html"));
  console.log("[PrimordialOS] Cockpit window created.");

  // Force DevTools open for debugging
  win.webContents.openDevTools();

  return win;
}

// ======================================================
// TERMINAL IPC
// ======================================================
ipcMain.on("primordial-terminal", async (_event, commandString) => {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return;

  console.log(`[Osmium] Terminal command received: "${commandString}"`);

  try {
    const response = await router.routeTerminal(commandString);
    console.log(`[Osmium] Response: ${response}`);
    win.webContents.send("terminal-response", response);
  } catch (err) {
    console.error("[Osmium] ERROR:", err);
    win.webContents.send("terminal-response", "Error: " + err.message);
  }
});

// ======================================================
// REALM ENGINE LOOP
// ======================================================
let tick = 0;
async function primordialLoop() {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return;

  tick++;
  console.log(`--- Realm Tick ${tick} ---`);

  const task = kernel.nextTask(tick);
  console.log(`[Kernel] Next task: agent=${task.agent}, payload=${JSON.stringify(task.payload)}`);

  const result = await agentCore.run(task.agent, task.payload);
  console.log(`[AgentCore] Result: ${JSON.stringify(result)}`);

  const telemetry = {
    ...(result.telemetry || {}),
    mode: kernel.mode,
    tick
  };

  kernel.updateFromTelemetry(telemetry);
  console.log(`[Telemetry] ${JSON.stringify(telemetry)}`);

  win.webContents.send("ui-update", telemetry);
}

// ======================================================
// APP LIFECYCLE
// ======================================================
app.whenReady().then(() => {
  console.log("[PrimordialOS] App ready. Booting cockpit...");
  createWindow();
  setInterval(primordialLoop, 1000);
});

app.on("window-all-closed", () => {
  console.log("[PrimordialOS] All windows closed. Quitting.");
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
