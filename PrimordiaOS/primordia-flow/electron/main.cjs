/**
 * ==============================================================================
 * PRIMORDIA FLOW — ELECTRON MAIN PROCESS
 * Architecture: Sovereign Desktop Architecture (Rule 5 Compliant)
 * Tier 1: Local Node.js Headless Daemon (Port 3005 / SQLite WAL / 10-Agent Swarm)
 * Tier 2: Chromium Electron Shell + System Tray Persistence + Native Toasts
 * ==============================================================================
 */

const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn, spawnSync } = require('child_process');
const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain, shell } = require('electron');

const APP_NAME = 'Primordia Flow';
const APP_ID = 'com.primordiaos.flow';
const DAEMON_PORT = parseInt(process.env.FLOW_DAEMON_PORT || '3006', 10);
const DEV_PORT = parseInt(process.env.VITE_PORT || '5174', 10);
const DEV_URL = `http://localhost:${DEV_PORT}`;

// App user model ID for Windows toasts
if (process.platform === 'win32' && app.setAppUserModelId) {
  app.setAppUserModelId(APP_ID);
}

let mainWindow = null;
let tray = null;
let isQuitting = false;
let daemonProcess = null;
let liveMode = false;

// ── Path Resolution ───────────────────────────────────────────────────────────
const flowRootDir = path.resolve(__dirname, '..');
const preloadScript = path.resolve(__dirname, 'preload.cjs');
const daemonScript = path.resolve(flowRootDir, 'backend', 'daemon.ts');
const distHtml = path.resolve(flowRootDir, 'frontend', 'dist', 'index.html');

// ── Native Toasts ─────────────────────────────────────────────────────────────
function showDesktopToast(title, body) {
  try {
    if (!Notification.isSupported()) return;
    const notif = new Notification({
      title: title || APP_NAME,
      body: body || '',
      silent: false
    });
    notif.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    });
    notif.show();
  } catch (err) {
    console.error('[Toast Error]:', err);
  }
}

// ── System Tray ───────────────────────────────────────────────────────────────
function createTray() {
  const fallbackPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAWElEQVR42mP8z8AARBgYGBhAmJGBgZEBiRnR+TAaG6AIGf//Z2AkpA4mhh5gRBcHYxMihBmgGDBqAMg1ACR3EBkY/iPTpMijGyCG7A1s7scwAJ0N4mCgPwUA1Hchd6W8vE8AAAAASUVORK5CYII=';
  const icon = nativeImage.createFromDataURL(fallbackPng);

  tray = new Tray(icon);
  tray.setToolTip(`${APP_NAME} — Sovereign Prospect Heat-Orbit Engine`);

  const menu = Menu.buildFromTemplate([
    {
      label: 'Open Primordia Flow',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: '⚡ Trigger /boost',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('flow:boost-trigger');
        }
      }
    },
    {
      label: 'Toggle Live Mode',
      click: () => {
        liveMode = !liveMode;
        if (mainWindow) {
          mainWindow.webContents.send('flow:live-mode-changed', liveMode);
        }
        showDesktopToast('Mode Changed', liveMode ? '⚡ LIVE MODE ACTIVE' : '🛡️ STAGING MODE ACTIVE');
      }
    },
    { type: 'separator' },
    {
      label: 'Quit Primordia Flow',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(menu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ── Daemon Supervisor ─────────────────────────────────────────────────────────
function checkDaemon(port) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: '/api/health',
      method: 'GET',
      timeout: 600
    }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

async function startDaemon() {
  const isUp = await checkDaemon(DAEMON_PORT);
  if (isUp) {
    console.log(`[Daemon Supervisor] Daemon already active on port ${DAEMON_PORT}`);
    return;
  }

  console.log(`[Daemon Supervisor] Spawning dedicated Primordia Flow daemon on port ${DAEMON_PORT}...`);
  const execCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  daemonProcess = spawn(execCmd, ['tsx', daemonScript], {
    cwd: flowRootDir,
    env: { ...process.env, FLOW_DAEMON_PORT: String(DAEMON_PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    shell: process.platform === 'win32'
  });

  daemonProcess.stdout.on('data', (d) => {
    console.log(`[Flow Daemon] ${d.toString().trim()}`);
  });

  daemonProcess.stderr.on('data', (d) => {
    console.error(`[Flow Daemon ERR] ${d.toString().trim()}`);
  });

  // Poll until ready
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    if (await checkDaemon(DAEMON_PORT)) {
      console.log(`✔ [Daemon Supervisor] Primordia Flow daemon verified ready on port ${DAEMON_PORT}`);
      break;
    }
  }
}

function killDaemonTree() {
  if (daemonProcess && daemonProcess.pid) {
    console.log(`[Daemon Supervisor] Terminating daemon PID ${daemonProcess.pid}...`);
    try {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/pid', String(daemonProcess.pid), '/T', '/F'], { windowsHide: true });
      } else {
        daemonProcess.kill('SIGTERM');
      }
    } catch (e) {}
    daemonProcess = null;
  }
}

// ── Window Management ─────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1080,
    minHeight: 700,
    title: APP_NAME,
    backgroundColor: '#090a0f',
    webPreferences: {
      preload: preloadScript,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.setMenuBarVisibility(false);

  const targetUrl = (!app.isPackaged && fs.existsSync(path.resolve(flowRootDir, 'frontend', 'src')))
    ? DEV_URL
    : (fs.existsSync(distHtml) ? `file://${distHtml}` : DEV_URL);

  console.log(`[Electron] Loading UI target: ${targetUrl}`);
  mainWindow.loadURL(targetUrl).catch(() => {
    // Retry once if dev server is warming up
    setTimeout(() => mainWindow.loadURL(targetUrl), 1500);
  });

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      showDesktopToast(APP_NAME, 'Application minimized to system tray.');
    }
  });
}

// ── IPC Handlers ──────────────────────────────────────────────────────────────
ipcMain.handle('flow:trigger-boost', async () => {
  return { success: true, triggered: true };
});

ipcMain.handle('flow:get-daemon-status', async () => {
  const isUp = await checkDaemon(DAEMON_PORT);
  return { running: isUp, port: DAEMON_PORT, liveMode };
});

ipcMain.handle('flow:toggle-live-mode', (_, desired) => {
  liveMode = typeof desired === 'boolean' ? desired : !liveMode;
  return liveMode;
});

ipcMain.handle('flow:show-notification', (_, { title, body }) => {
  showDesktopToast(title, body);
  return true;
});

ipcMain.handle('flow:open-external', (_, url) => {
  if (url && typeof url === 'string') {
    shell.openExternal(url);
  }
  return true;
});

// ── App Lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  await startDaemon();
  createTray();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else if (mainWindow) mainWindow.show();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  killDaemonTree();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep alive in tray unless explicitly quit
  }
});
