/**
 * ==============================================================================
 * PRIMORDIA FLOW — ELECTRON MAIN PROCESS
 * Architecture: Sovereign Desktop Architecture (Rule 5 Compliant)
 * Tier 1: Local Node.js Headless Daemon (Port 3001 / SQLite WAL / Antigravity Loop)
 * Tier 2: Chromium Electron Shell + System Tray Persistence + Native Toasts
 * ==============================================================================
 */

const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

// Safe Electron imports allowing headless testing in plain Node.js environments
let electronModule = null;
try {
  electronModule = require('electron');
} catch (e) {
  electronModule = null;
}

const isElectronRuntime = Boolean(electronModule && typeof electronModule === 'object' && electronModule.app);

const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain, shell } = isElectronRuntime
  ? electronModule
  : {
      app: {
        isPackaged: false,
        getAppPath: () => path.resolve(__dirname, '..'),
        setAppUserModelId: () => {},
        setName: () => {},
        requestSingleInstanceLock: () => true,
        whenReady: () => Promise.resolve(),
        quit: () => {},
        on: () => {}
      },
      BrowserWindow: class MockBrowserWindow {
        constructor() {
          this.webContents = {
            send: () => {},
            executeJavaScript: () => Promise.resolve(),
            setWindowOpenHandler: () => {}
          };
        }
        on() {}
        once() {}
        show() {}
        focus() {}
        hide() {}
        isVisible() { return true; }
        isDestroyed() { return false; }
        isMinimized() { return false; }
        isMaximized() { return false; }
        restore() {}
        minimize() {}
        maximize() {}
        unmaximize() {}
        close() {}
        loadURL() { return Promise.resolve(); }
        loadFile() { return Promise.resolve(); }
      },
      Tray: class MockTray {
        on() {}
        setToolTip() {}
        setContextMenu() {}
      },
      Menu: {
        buildFromTemplate: (template) => template
      },
      nativeImage: {
        createEmpty: () => ({ resize: () => ({}) }),
        createFromPath: () => ({ resize: () => ({}) }),
        createFromDataURL: () => ({ resize: () => ({}) })
      },
      Notification: class MockNotification {
        static isSupported() { return false; }
        show() {}
        on() {}
      },
      ipcMain: {
        handle: () => {},
        on: () => {}
      },
      shell: {
        openExternal: () => Promise.resolve()
      }
    };

// ── Configuration & Metadata ──────────────────────────────────────────────────
const APP_NAME = 'Primordia Flow';
const APP_ID = 'com.primordiaos.flow';
const DEFAULT_DAEMON_PORT = process.env.DAEMON_PORT ? parseInt(process.env.DAEMON_PORT, 10) : 3001;
const DEV_PORT = process.env.VITE_PORT ? parseInt(process.env.VITE_PORT, 10) : 5173;
const DEV_URL = `http://localhost:${DEV_PORT}/?tab=boost`;

// Set Windows AppUserModelId for native toast notifications
if (process.platform === 'win32' && app.setAppUserModelId) {
  app.setAppUserModelId(APP_ID);
}
if (app.setName) {
  app.setName(APP_NAME);
}

// ── State Management ──────────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;
let isQuitting = false;
let liveMode = false; // default to staging / simulation
let daemonProcess = null;
let daemonRestartCount = 0;
const MAX_DAEMON_RESTARTS = 5;

const daemonStatus = {
  running: false,
  ready: false,
  pid: null,
  port: DEFAULT_DAEMON_PORT,
  managed: false,
  error: null,
  uptimeStart: null,
};

// ── Path Resolution ───────────────────────────────────────────────────────────
function resolveWorkspacePaths() {
  const isPackaged = Boolean(app.isPackaged);
  const electronDir = __dirname;
  const appPath = typeof app.getAppPath === 'function' ? app.getAppPath() : path.resolve(electronDir, '..');
  
  // Support packaged app.asar and unpacked paths
  const workspaceRoot = isPackaged
    ? appPath
    : path.resolve(electronDir, '..');

  const unpackedRoot = isPackaged
    ? workspaceRoot.replace(/app\.asar$/, 'app.asar.unpacked')
    : workspaceRoot;

  // Determine MoneyPlugHub folder
  const possibleMphPaths = [
    path.join(unpackedRoot, 'MoneyPlugHub'),
    path.join(workspaceRoot, 'MoneyPlugHub'),
    path.join(process.resourcesPath || '', 'app', 'MoneyPlugHub'),
    unpackedRoot,
    workspaceRoot
  ];
  const moneyPlugHubDir = possibleMphPaths.find(p => fs.existsSync(path.join(p, 'package.json'))) || path.join(workspaceRoot, 'MoneyPlugHub');

  const clientDistHtml = path.join(moneyPlugHubDir, 'dist', 'client', 'index.html');
  const serverDistJs = path.join(moneyPlugHubDir, 'dist', 'server', 'backend', 'server.js');
  const serverSourceTs = path.join(moneyPlugHubDir, 'src', 'backend', 'server.ts');
  const preloadPath = path.join(electronDir, 'preload.cjs');

  // Find icon
  const iconCandidates = [
    path.join(moneyPlugHubDir, 'public', 'logo.png'),
    path.join(moneyPlugHubDir, 'public', 'moneyplughub_badge.png'),
    path.join(workspaceRoot, 'public', 'logo.png'),
  ];
  const iconPath = iconCandidates.find(p => fs.existsSync(p)) || null;

  return {
    workspaceRoot,
    unpackedRoot,
    moneyPlugHubDir,
    clientDistHtml,
    serverDistJs,
    serverSourceTs,
    preloadPath,
    iconPath,
    isPackaged
  };
}

const paths = resolveWorkspacePaths();

// ── Native Toast Notifications Helper ─────────────────────────────────────────
function showDesktopNotification(title, body, onClick) {
  try {
    if (!Notification.isSupported()) {
      console.log(`[Notification Fallback] ${title}: ${body}`);
      return null;
    }

    let icon = undefined;
    if (paths.iconPath && fs.existsSync(paths.iconPath)) {
      icon = nativeImage.createFromPath(paths.iconPath);
    }

    const notif = new Notification({
      title,
      body,
      icon,
      silent: false
    });

    if (onClick && typeof onClick === 'function') {
      notif.on('click', () => {
        showAndFocusWindow();
        onClick();
      });
    }

    notif.show();
    return notif;
  } catch (err) {
    console.error('[Notification Error]', err);
    return null;
  }
}

// ── System Tray Helper ────────────────────────────────────────────────────────
function createFallbackIcon() {
  if (paths.iconPath && fs.existsSync(paths.iconPath)) {
    try {
      return nativeImage.createFromPath(paths.iconPath).resize({ width: 16, height: 16 });
    } catch (e) {}
  }
  // Valid 16x16 golden sigil PNG data URL fallback to prevent empty Tray crash on Windows
  const fallbackPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAWElEQVR42mP8z8AARBgYGBhAmJGBgZEBiRnR+TAaG6AIGf//Z2AkpA4mhh5gRBcHYxMihBmgGDBqAMg1ACR3EBkY/iPTpMijGyCG7A1s7scwAJ0N4mCgPwUA1Hchd6W8vE8AAAAASUVORK5CYII=';
  try {
    return nativeImage.createFromDataURL(fallbackPng);
  } catch (e) {
    return nativeImage.createEmpty();
  }
}

function updateTrayMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Primordia Flow',
      type: 'normal',
      click: () => showAndFocusWindow()
    },
    { type: 'separator' },
    {
      label: '⚡ Trigger /boost',
      type: 'normal',
      click: async () => {
        await executeBoostFromTray();
      }
    },
    {
      label: `Toggle Live Mode (${liveMode ? 'ACTIVE: LIVE' : 'STAGING'})`,
      type: 'checkbox',
      checked: liveMode,
      click: () => {
        toggleLiveMode();
      }
    },
    {
      label: 'View Traces',
      type: 'normal',
      click: () => {
        showAndFocusWindow();
        navigateToTraces();
      }
    },
    { type: 'separator' },
    {
      label: `Daemon: ${daemonStatus.ready ? 'Online (3001)' : (daemonStatus.running ? 'Starting...' : 'Offline')}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Quit',
      type: 'normal',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(`Primordia Flow — Sovereign Antigravity Cockpit [${liveMode ? 'LIVE' : 'STAGING'}]`);
}

function initTray() {
  try {
    const icon = createFallbackIcon();
    tray = new Tray(icon);
    tray.setToolTip('Primordia Flow — Sovereign Antigravity Cockpit');

    tray.on('click', () => {
      if (mainWindow && mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        showAndFocusWindow();
      }
    });

    tray.on('double-click', () => {
      showAndFocusWindow();
    });

    updateTrayMenu();
  } catch (err) {
    console.error('[Tray Initialization Error]', err);
  }
}

// ── Live Mode & Actions ───────────────────────────────────────────────────────
function toggleLiveMode(desiredState) {
  liveMode = typeof desiredState === 'boolean' ? desiredState : !liveMode;
  updateTrayMenu();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('flow:live-mode-changed', liveMode);
  }

  showDesktopNotification(
    'Primordia Flow — Mode Switched',
    liveMode
      ? '⚡ LIVE MODE ACTIVE: Live public distribution & verifiable transactions enabled.'
      : '🛡️ STAGING MODE: Running sandboxed simulation loops.',
    () => showAndFocusWindow()
  );

  return liveMode;
}

function navigateToTraces() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('flow:navigate-traces');
  // If web contents is loaded, execute deep-link or hash navigation
  mainWindow.webContents.executeJavaScript(`
    if (window.location.search.includes('tab=boost')) {
      const tracesSection = document.getElementById('traces') || document.querySelector('[data-tab="traces"]');
      if (tracesSection) tracesSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.search = '?tab=boost#traces';
    }
  `).catch(() => {});
}

// ── Daemon Supervisor (Tier 1 Local Node Engine) ──────────────────────────────
function checkPortListening(port, requestPath = '/api/health') {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: requestPath,
        method: 'GET',
        timeout: 800
      },
      (res) => {
        // Drain stream to avoid leaking socket handles
        res.resume();
        resolve(res.statusCode < 500);
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function waitForDaemonReady(port, maxAttempts = 30, intervalMs = 500) {
  for (let i = 0; i < maxAttempts; i++) {
    const isUp = await checkPortListening(port, '/api/health');
    if (isUp) return true;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  // Fallback check root if /api/health returned 404
  return await checkPortListening(port, '/');
}

async function startDaemonSupervisor() {
  console.log(`[Daemon Supervisor] Checking port ${DEFAULT_DAEMON_PORT} status...`);
  const alreadyRunning = await checkPortListening(DEFAULT_DAEMON_PORT, '/api/health');

  if (alreadyRunning) {
    console.log(`✔ [Daemon Supervisor] Found existing active daemon on port ${DEFAULT_DAEMON_PORT}. Attaching supervisor.`);
    daemonStatus.running = true;
    daemonStatus.ready = true;
    daemonStatus.managed = false;
    daemonStatus.uptimeStart = Date.now();
    updateTrayMenu();
    broadcastDaemonStatus();
    return;
  }

  // Determine daemon target script & execution runtime
  let execCmd = 'node';
  let execArgs = [];
  let execCwd = paths.moneyPlugHubDir;
  let customEnv = {
    PORT: String(DEFAULT_DAEMON_PORT),
    NODE_ENV: app.isPackaged ? 'production' : (process.env.NODE_ENV || 'development')
  };

  // In packaged desktop application, use Electron binary with ELECTRON_RUN_AS_NODE=1 so external node is not required
  if (app.isPackaged) {
    execCmd = process.execPath;
    customEnv.ELECTRON_RUN_AS_NODE = '1';
    customEnv.ELECTRON_NO_ASAR = '0';
  }

  if (fs.existsSync(paths.serverDistJs)) {
    console.log(`[Daemon Supervisor] Launching compiled daemon: ${paths.serverDistJs}`);
    execArgs = [paths.serverDistJs];
  } else if (fs.existsSync(paths.serverSourceTs)) {
    console.log(`[Daemon Supervisor] Launching TypeScript daemon via tsx: ${paths.serverSourceTs}`);
    execCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    execArgs = ['tsx', 'src/backend/server.ts'];
  } else {
    console.warn('[Daemon Supervisor] Could not locate backend server script. Waiting for external daemon.');
    daemonStatus.error = 'Backend server script not found on disk';
    broadcastDaemonStatus();
    return;
  }

  try {
    daemonStatus.managed = true;
    daemonStatus.running = true;
    daemonStatus.ready = false;
    daemonStatus.uptimeStart = Date.now();

    daemonProcess = spawn(execCmd, execArgs, {
      cwd: execCwd,
      env: {
        ...process.env,
        ...customEnv
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      shell: !app.isPackaged && process.platform === 'win32'
    });

    daemonStatus.pid = daemonProcess.pid;
    console.log(`[Daemon Supervisor] Daemon spawned with PID ${daemonProcess.pid}`);
    broadcastDaemonStatus();

    daemonProcess.stdout.on('data', (chunk) => {
      const msg = chunk.toString().trim();
      if (msg) console.log(`[Primordia Daemon] ${msg}`);
    });

    daemonProcess.stderr.on('data', (chunk) => {
      const msg = chunk.toString().trim();
      if (msg) console.error(`[Primordia Daemon ERR] ${msg}`);
    });

    daemonProcess.on('exit', (code, signal) => {
      console.log(`[Daemon Supervisor] Process exited with code ${code}, signal ${signal}`);
      daemonStatus.running = false;
      daemonStatus.ready = false;
      daemonStatus.pid = null;
      daemonProcess = null;
      broadcastDaemonStatus();
      updateTrayMenu();

      if (!isQuitting) {
        if (daemonRestartCount < MAX_DAEMON_RESTARTS) {
          daemonRestartCount++;
          console.warn(`[Daemon Supervisor] Crash detected. Auto-restarting daemon (attempt ${daemonRestartCount}/${MAX_DAEMON_RESTARTS}) in 2000ms...`);
          setTimeout(startDaemonSupervisor, 2000);
        } else {
          console.error('[Daemon Supervisor] Exceeded maximum crash restart attempts.');
          daemonStatus.error = 'Exceeded maximum crash restart attempts';
          broadcastDaemonStatus();
        }
      }
    });

    // Wait for daemon port readiness in background
    const isReady = await waitForDaemonReady(DEFAULT_DAEMON_PORT, 25, 400);
    if (isReady) {
      daemonStatus.ready = true;
      daemonStatus.error = null;
      daemonRestartCount = 0; // reset restart counter on success
      console.log(`⚡ [Daemon Supervisor] Primordia Flow Daemon is ONLINE on port ${DEFAULT_DAEMON_PORT}`);
      updateTrayMenu();
      broadcastDaemonStatus();
    } else {
      console.warn('[Daemon Supervisor] Daemon process running but healthcheck did not respond within timeout.');
    }
  } catch (err) {
    console.error('[Daemon Supervisor] Spawn failed:', err);
    daemonStatus.running = false;
    daemonStatus.error = err.message;
    broadcastDaemonStatus();
  }
}

function stopDaemonSupervisor() {
  if (daemonProcess && daemonStatus.managed) {
    console.log('[Daemon Supervisor] Terminating managed daemon process...');
    try {
      if (process.platform === 'win32' && daemonProcess.pid) {
        // Synchronous taskkill ensures child process tree is destroyed before main process quits
        const { spawnSync } = require('child_process');
        spawnSync('taskkill', ['/pid', String(daemonProcess.pid), '/T', '/F'], { windowsHide: true });
      } else {
        daemonProcess.kill('SIGTERM');
      }
    } catch (e) {
      console.error('[Daemon Supervisor] Kill error:', e);
    }
    daemonProcess = null;
    daemonStatus.running = false;
    daemonStatus.ready = false;
  }
}

function broadcastDaemonStatus() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('flow:daemon-status-changed', { ...daemonStatus });
  }
}

// ── Master /boost Executor ───────────────────────────────────────────────────
function executeBoost(options = {}) {
  return new Promise((resolve, reject) => {
    const isLive = options.distributeLive !== undefined ? options.distributeLive : liveMode;
    const reqData = JSON.stringify({
      directive: options.directive || '/boost',
      distributeLive: isLive,
      dryRun: !isLive,
      real: isLive,
      mode: isLive ? 'real' : 'simulated',
      ...options
    });

    const tryRequest = (port, requestPath) => new Promise((res) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: requestPath,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(reqData)
          },
          timeout: 15000
        },
        (response) => {
          let body = '';
          response.on('data', chunk => body += chunk);
          response.on('end', () => {
            try {
              const json = JSON.parse(body);
              if (response.statusCode >= 200 && response.statusCode < 300 && json.success !== false) {
                res({ ok: true, data: json });
              } else {
                res({ ok: false, error: json.error || `Server responded with status ${response.statusCode}` });
              }
            } catch (err) {
              res({ ok: false, error: 'JSON parse error: ' + err.message });
            }
          });
        }
      );

      req.on('error', (err) => res({ ok: false, error: err.message }));
      req.on('timeout', () => {
        req.destroy();
        res({ ok: false, error: 'Timeout waiting for /boost' });
      });

      req.write(reqData);
      req.end();
    });

    // Execute with port and path fallbacks
    (async () => {
      let result = await tryRequest(DEFAULT_DAEMON_PORT, '/api/boost');
      if (!result.ok) {
        result = await tryRequest(DEFAULT_DAEMON_PORT, '/api/phom/boost');
      }
      if (!result.ok) {
        result = await tryRequest(DEFAULT_DAEMON_PORT, '/boost');
      }
      if (!result.ok && DEFAULT_DAEMON_PORT !== 3000) {
        console.warn(`[Boost] Port 3001 failed (${result.error}), trying secondary port 3000...`);
        result = await tryRequest(3000, '/api/boost');
        if (!result.ok) {
          result = await tryRequest(3000, '/api/phom/boost');
        }
      }

      if (result.ok && result.data) {
        const payload = result.data.data || result.data;
        const verified = payload.leads_verified ?? payload.signals_processed ?? 0;
        const highHeat = payload.high_heat_prospects ?? 0;
        const latency = payload.total_latency_ms ?? 0;

        // Trigger Native OS Toast Notification
        showDesktopNotification(
          '⚡ Primordia Flow — /boost Completed',
          `Verified: ${verified} | 🔥 High-Heat: ${highHeat} | Latency: ${latency}ms [${isLive ? 'LIVE' : 'STAGING'}]`,
          () => navigateToTraces()
        );

        // If high-heat prospects detected, raise explicit alert notification and emit flow:high-heat-lead
        if (highHeat > 0) {
          setTimeout(() => {
            showDesktopNotification(
              '🔥 High-Heat Prospects Alert',
              `${highHeat} high-heat leads scored in top tier! Outreach queue primed.`,
              () => navigateToTraces()
            );
          }, 600);
        }

        // Notify Renderer via IPC
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('flow:boost-completed', payload);

          // Emit individual or batch high-heat lead alerts to renderer
          const topLeads = Array.isArray(payload.top_leads) ? payload.top_leads : [];
          if (topLeads.length > 0) {
            for (const lead of topLeads) {
              mainWindow.webContents.send('flow:high-heat-lead', lead);
            }
          } else if (highHeat > 0) {
            mainWindow.webContents.send('flow:high-heat-lead', {
              id: payload.boost_id || 'boost-lead',
              name: 'High-Heat Prospect Batch',
              heat_score: 95,
              band: 'Tier 1 Ultra',
              source: 'PHOM Orbit Engine',
              metadata: { high_heat_count: highHeat }
            });
          }
        }

        resolve(payload);
      } else {
        const errorMsg = result.error || 'Unknown /boost failure';
        showDesktopNotification(
          '❌ Primordia Flow — /boost Failed',
          `Could not execute /boost on port ${DEFAULT_DAEMON_PORT}: ${errorMsg}`
        );
        reject(new Error(errorMsg));
      }
    })();
  });
}

async function executeBoostFromTray() {
  try {
    showDesktopNotification(
      '⚡ Primordia Flow',
      `Igniting ${liveMode ? 'LIVE' : 'STAGING'} /boost sovereign cycle...`
    );
    await executeBoost();
  } catch (err) {
    console.error('[Tray Boost Error]', err);
  }
}

// ── Window Management ────────────────────────────────────────────────────────
function showAndFocusWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

async function loadApplicationUrl() {
  if (!mainWindow) return;

  // In production, prioritize bundled client dist
  if (app.isPackaged) {
    fallbackToDist();
    return;
  }

  // In development, probe Vite dev server
  const isViteUp = await checkPortListening(DEV_PORT, '/');
  if (isViteUp) {
    console.log(`[Window Manager] Loading Vite Live Cockpit: ${DEV_URL}`);
    mainWindow.loadURL(DEV_URL).catch((err) => {
      console.warn('[Window Manager] Failed to load dev URL, falling back to dist...', err.message);
      fallbackToDist();
    });
    return;
  }

  // Vite is still starting up: display branded loader and poll for up to 15 seconds
  console.log(`[Window Manager] Waiting for Vite dev server on port ${DEV_PORT}...`);
  mainWindow.loadURL(`data:text/html,<html><body style="background:%230a0b0e;color:%2338bdf8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;user-select:none;"><h2 style="margin:0 0 10px 0;letter-spacing:1px;">⚡ Primordia Flow</h2><p style="color:%2394a3b8;font-size:14px;margin:0;">Connecting to sovereign cockpit substrate (http://localhost:${DEV_PORT}/?tab=boost)...</p><div style="margin-top:20px;width:32px;height:32px;border:3px solid %2338bdf8;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style></body></html>`).catch(() => {});

  let attempts = 0;
  const maxAttempts = 30; // 30 x 500ms = 15 seconds
  const retryTimer = setInterval(async () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      clearInterval(retryTimer);
      return;
    }
    attempts++;
    const viteUp = await checkPortListening(DEV_PORT, '/');
    if (viteUp) {
      clearInterval(retryTimer);
      console.log(`[Window Manager] Vite dev server connected: ${DEV_URL}`);
      mainWindow.loadURL(DEV_URL);
    } else if (attempts >= maxAttempts) {
      clearInterval(retryTimer);
      console.warn('[Window Manager] Vite dev server did not start within timeout. Checking production dist...');
      fallbackToDist();
    }
  }, 500);
}

function fallbackToDist() {
  if (!mainWindow) return;
  if (fs.existsSync(paths.clientDistHtml)) {
    console.log(`[Window Manager] Loading production bundle: ${paths.clientDistHtml}`);
    mainWindow.loadFile(paths.clientDistHtml, {
      query: { tab: 'boost' }
    });
  } else {
    console.warn('[Window Manager] Neither Vite dev server nor client dist HTML could be located.');
    mainWindow.loadURL(`data:text/html,<html><body style="background:%230a0b0e;color:%23f87171;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;"><h2>⚡ Primordia Flow</h2><p style="color:%2394a3b8;">MoneyPlugHub Cockpit dist not found. Run: <code>npm run flow:dev</code></p></body></html>`);
  }
}

function createWindow() {
  let appIcon = undefined;
  if (paths.iconPath && fs.existsSync(paths.iconPath)) {
    appIcon = nativeImage.createFromPath(paths.iconPath);
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: APP_NAME,
    icon: appIcon,
    backgroundColor: '#0a0b0e',
    show: false,
    webPreferences: {
      preload: paths.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Intercept window close to preserve sovereign daemon in System Tray (Rule 5)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  loadApplicationUrl();
  return mainWindow;
}

// ── IPC Handlers ─────────────────────────────────────────────────────────────
function registerIpcHandlers() {
  ipcMain.handle('flow:trigger-boost', async (_, options) => {
    return await executeBoost(options);
  });

  ipcMain.handle('flow:toggle-live-mode', () => {
    return toggleLiveMode();
  });

  ipcMain.handle('flow:get-live-mode', () => {
    return liveMode;
  });

  ipcMain.handle('flow:set-live-mode', (_, val) => {
    return toggleLiveMode(Boolean(val));
  });

  ipcMain.handle('flow:get-daemon-status', () => {
    return { ...daemonStatus };
  });

  ipcMain.handle('flow:restart-daemon', async () => {
    stopDaemonSupervisor();
    await new Promise(r => setTimeout(r, 1000));
    await startDaemonSupervisor();
    return { ...daemonStatus };
  });

  ipcMain.handle('flow:open-traces', () => {
    navigateToTraces();
  });

  ipcMain.handle('flow:show-notification', (_, { title, body }) => {
    showDesktopNotification(title, body);
    return true;
  });

  ipcMain.handle('flow:window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.handle('flow:window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.handle('flow:window-close', () => {
    if (mainWindow) mainWindow.close();
  });
}

// ── Application Lifecycle ────────────────────────────────────────────────────
if (isElectronRuntime) {
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    console.log('[Primordia Flow] Another instance is already active. Exiting duplicate.');
    app.quit();
  } else {
    app.on('second-instance', () => {
      showAndFocusWindow();
    });

    app.whenReady().then(async () => {
      console.log('========================================================');
      console.log(`  ⚡ ${APP_NAME} — Sovereign Antigravity Shell`);
      console.log('========================================================');

      registerIpcHandlers();
      initTray();
      createWindow();
      await startDaemonSupervisor();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow();
        } else {
          showAndFocusWindow();
        }
      });
    });

    app.on('before-quit', () => {
      isQuitting = true;
      stopDaemonSupervisor();
    });

    app.on('window-all-closed', () => {
      // Keep alive in tray on Windows/macOS unless quit explicitly (Rule 5)
      if (process.platform === 'darwin') {
        // macOS standard behavior
      }
    });
  }
}

// Exports for programmatic testing or supervisor embedding
module.exports = {
  APP_NAME,
  APP_ID,
  DEFAULT_DAEMON_PORT,
  resolveWorkspacePaths,
  checkPortListening,
  executeBoost,
  toggleLiveMode,
  daemonStatus,
  createWindow,
  initTray,
  startDaemonSupervisor,
  stopDaemonSupervisor,
  showDesktopNotification,
  broadcastDaemonStatus,
  registerIpcHandlers
};
