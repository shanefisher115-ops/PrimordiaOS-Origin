"use strict";
/**
 * ==============================================================================
 * PRIMORDIA FLOW — ELECTRON MAIN PROCESS (TypeScript)
 * Architecture: Sovereign Desktop Architecture (Rule 5 Compliant)
 * Tier 1: Local Node.js Headless Daemon (Port 3001 / SQLite WAL / Antigravity Loop)
 * Tier 2: Chromium Electron Shell + System Tray Persistence + Native Toasts
 * ==============================================================================
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.daemonStatus = exports.DEV_URL = exports.DEV_PORT = exports.DEFAULT_DAEMON_PORT = exports.APP_ID = exports.APP_NAME = void 0;
exports.resolveWorkspacePaths = resolveWorkspacePaths;
exports.showDesktopNotification = showDesktopNotification;
exports.updateTrayMenu = updateTrayMenu;
exports.initTray = initTray;
exports.toggleLiveMode = toggleLiveMode;
exports.navigateToTraces = navigateToTraces;
exports.checkPortListening = checkPortListening;
exports.waitForDaemonReady = waitForDaemonReady;
exports.startDaemonSupervisor = startDaemonSupervisor;
exports.stopDaemonSupervisor = stopDaemonSupervisor;
exports.broadcastDaemonStatus = broadcastDaemonStatus;
exports.executeBoost = executeBoost;
exports.executeBoostFromTray = executeBoostFromTray;
exports.showAndFocusWindow = showAndFocusWindow;
exports.loadApplicationUrl = loadApplicationUrl;
exports.fallbackToDist = fallbackToDist;
exports.createWindow = createWindow;
exports.registerIpcHandlers = registerIpcHandlers;
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const http = __importStar(require("http"));
const child_process_1 = require("child_process");
exports.APP_NAME = 'Primordia Flow';
exports.APP_ID = 'com.primordiaos.flow';
exports.DEFAULT_DAEMON_PORT = process.env.DAEMON_PORT ? parseInt(process.env.DAEMON_PORT, 10) : 3001;
exports.DEV_PORT = process.env.VITE_PORT ? parseInt(process.env.VITE_PORT, 10) : 5173;
exports.DEV_URL = `http://localhost:${exports.DEV_PORT}/?tab=boost`;
if (process.platform === 'win32' && electron_1.app.setAppUserModelId) {
    electron_1.app.setAppUserModelId(exports.APP_ID);
}
if (electron_1.app.setName) {
    electron_1.app.setName(exports.APP_NAME);
}
let mainWindow = null;
let tray = null;
let isQuitting = false;
let liveMode = false;
let daemonProcess = null;
let daemonRestartCount = 0;
const MAX_DAEMON_RESTARTS = 5;
exports.daemonStatus = {
    running: false,
    ready: false,
    pid: null,
    port: exports.DEFAULT_DAEMON_PORT,
    managed: false,
    error: null,
    uptimeStart: null,
};
function resolveWorkspacePaths() {
    const isPackaged = Boolean(electron_1.app.isPackaged);
    const electronDir = __dirname;
    const appPath = typeof electron_1.app.getAppPath === 'function' ? electron_1.app.getAppPath() : path.resolve(electronDir, '..');
    const workspaceRoot = isPackaged
        ? appPath
        : path.resolve(electronDir, '..');
    const unpackedRoot = isPackaged
        ? workspaceRoot.replace(/app\.asar$/, 'app.asar.unpacked')
        : workspaceRoot;
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
function showDesktopNotification(title, body, onClick) {
    try {
        if (!electron_1.Notification.isSupported()) {
            console.log(`[Notification Fallback] ${title}: ${body}`);
            return null;
        }
        let icon = undefined;
        if (paths.iconPath && fs.existsSync(paths.iconPath)) {
            icon = electron_1.nativeImage.createFromPath(paths.iconPath);
        }
        const notif = new electron_1.Notification({
            title,
            body,
            icon,
            silent: false
        });
        if (onClick) {
            notif.on('click', () => {
                showAndFocusWindow();
                onClick();
            });
        }
        notif.show();
        return notif;
    }
    catch (err) {
        console.error('[Notification Error]', err);
        return null;
    }
}
function createFallbackIcon() {
    if (paths.iconPath && fs.existsSync(paths.iconPath)) {
        try {
            return electron_1.nativeImage.createFromPath(paths.iconPath).resize({ width: 16, height: 16 });
        }
        catch (e) { }
    }
    const fallbackPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAWElEQVR42mP8z8AARBgYGBhAmJGBgZEBiRnR+TAaG6AIGf//Z2AkpA4mhh5gRBcHYxMihBmgGDBqAMg1ACR3EBkY/iPTpMijGyCG7A1s7scwAJ0N4mCgPwUA1Hchd6W8vE8AAAAASUVORK5CYII=';
    try {
        return electron_1.nativeImage.createFromDataURL(fallbackPng);
    }
    catch (e) {
        return electron_1.nativeImage.createEmpty();
    }
}
function updateTrayMenu() {
    if (!tray)
        return;
    const contextMenu = electron_1.Menu.buildFromTemplate([
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
            label: `Daemon: ${exports.daemonStatus.ready ? 'Online (3001)' : (exports.daemonStatus.running ? 'Starting...' : 'Offline')}`,
            enabled: false
        },
        { type: 'separator' },
        {
            label: 'Quit',
            type: 'normal',
            click: () => {
                isQuitting = true;
                electron_1.app.quit();
            }
        }
    ]);
    tray.setContextMenu(contextMenu);
    tray.setToolTip(`Primordia Flow — Sovereign Antigravity Cockpit [${liveMode ? 'LIVE' : 'STAGING'}]`);
}
function initTray() {
    try {
        const icon = createFallbackIcon();
        tray = new electron_1.Tray(icon);
        tray.setToolTip('Primordia Flow — Sovereign Antigravity Cockpit');
        tray.on('click', () => {
            if (mainWindow && mainWindow.isVisible()) {
                mainWindow.hide();
            }
            else {
                showAndFocusWindow();
            }
        });
        tray.on('double-click', () => {
            showAndFocusWindow();
        });
        updateTrayMenu();
    }
    catch (err) {
        console.error('[Tray Initialization Error]', err);
    }
}
function toggleLiveMode(desiredState) {
    liveMode = typeof desiredState === 'boolean' ? desiredState : !liveMode;
    updateTrayMenu();
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('flow:live-mode-changed', liveMode);
    }
    showDesktopNotification('Primordia Flow — Mode Switched', liveMode
        ? '⚡ LIVE MODE ACTIVE: Live public distribution & verifiable transactions enabled.'
        : '🛡️ STAGING MODE: Running sandboxed simulation loops.', () => showAndFocusWindow());
    return liveMode;
}
function navigateToTraces() {
    if (!mainWindow || mainWindow.isDestroyed())
        return;
    mainWindow.webContents.send('flow:navigate-traces');
    mainWindow.webContents.executeJavaScript(`
    if (window.location.search.includes('tab=boost')) {
      const tracesSection = document.getElementById('traces') || document.querySelector('[data-tab="traces"]');
      if (tracesSection) tracesSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.search = '?tab=boost#traces';
    }
  `).catch(() => { });
}
function checkPortListening(port, requestPath = '/api/health') {
    return new Promise((resolve) => {
        const req = http.request({
            hostname: '127.0.0.1',
            port,
            path: requestPath,
            method: 'GET',
            timeout: 800
        }, (res) => {
            res.resume();
            resolve(res.statusCode ? res.statusCode < 500 : false);
        });
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
        if (isUp)
            return true;
        await new Promise(r => setTimeout(r, intervalMs));
    }
    return await checkPortListening(port, '/');
}
async function startDaemonSupervisor() {
    console.log(`[Daemon Supervisor] Checking port ${exports.DEFAULT_DAEMON_PORT} status...`);
    const alreadyRunning = await checkPortListening(exports.DEFAULT_DAEMON_PORT, '/api/health');
    if (alreadyRunning) {
        console.log(`✔ [Daemon Supervisor] Found existing active daemon on port ${exports.DEFAULT_DAEMON_PORT}. Attaching supervisor.`);
        exports.daemonStatus.running = true;
        exports.daemonStatus.ready = true;
        exports.daemonStatus.managed = false;
        exports.daemonStatus.uptimeStart = Date.now();
        updateTrayMenu();
        broadcastDaemonStatus();
        return;
    }
    let execCmd = 'node';
    let execArgs = [];
    let execCwd = paths.moneyPlugHubDir;
    let customEnv = {
        PORT: String(exports.DEFAULT_DAEMON_PORT),
        NODE_ENV: electron_1.app.isPackaged ? 'production' : (process.env.NODE_ENV || 'development')
    };
    if (electron_1.app.isPackaged) {
        execCmd = process.execPath;
        customEnv.ELECTRON_RUN_AS_NODE = '1';
        customEnv.ELECTRON_NO_ASAR = '0';
    }
    if (fs.existsSync(paths.serverDistJs)) {
        console.log(`[Daemon Supervisor] Launching compiled daemon: ${paths.serverDistJs}`);
        execArgs = [paths.serverDistJs];
    }
    else if (fs.existsSync(paths.serverSourceTs)) {
        console.log(`[Daemon Supervisor] Launching TypeScript daemon via tsx: ${paths.serverSourceTs}`);
        execCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
        execArgs = ['tsx', 'src/backend/server.ts'];
    }
    else {
        console.warn('[Daemon Supervisor] Could not locate backend server script. Waiting for external daemon.');
        exports.daemonStatus.error = 'Backend server script not found on disk';
        broadcastDaemonStatus();
        return;
    }
    try {
        exports.daemonStatus.managed = true;
        exports.daemonStatus.running = true;
        exports.daemonStatus.ready = false;
        exports.daemonStatus.uptimeStart = Date.now();
        daemonProcess = (0, child_process_1.spawn)(execCmd, execArgs, {
            cwd: execCwd,
            env: {
                ...process.env,
                ...customEnv
            },
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
            shell: !electron_1.app.isPackaged && process.platform === 'win32'
        });
        exports.daemonStatus.pid = daemonProcess.pid || null;
        console.log(`[Daemon Supervisor] Daemon spawned with PID ${daemonProcess.pid}`);
        broadcastDaemonStatus();
        daemonProcess.stdout?.on('data', (chunk) => {
            const msg = chunk.toString().trim();
            if (msg)
                console.log(`[Primordia Daemon] ${msg}`);
        });
        daemonProcess.stderr?.on('data', (chunk) => {
            const msg = chunk.toString().trim();
            if (msg)
                console.error(`[Primordia Daemon ERR] ${msg}`);
        });
        daemonProcess.on('exit', (code, signal) => {
            console.log(`[Daemon Supervisor] Process exited with code ${code}, signal ${signal}`);
            exports.daemonStatus.running = false;
            exports.daemonStatus.ready = false;
            exports.daemonStatus.pid = null;
            daemonProcess = null;
            broadcastDaemonStatus();
            updateTrayMenu();
            if (!isQuitting) {
                if (daemonRestartCount < MAX_DAEMON_RESTARTS) {
                    daemonRestartCount++;
                    console.warn(`[Daemon Supervisor] Crash detected. Auto-restarting daemon (attempt ${daemonRestartCount}/${MAX_DAEMON_RESTARTS}) in 2000ms...`);
                    setTimeout(startDaemonSupervisor, 2000);
                }
                else {
                    console.error('[Daemon Supervisor] Exceeded maximum crash restart attempts.');
                    exports.daemonStatus.error = 'Exceeded maximum crash restart attempts';
                    broadcastDaemonStatus();
                }
            }
        });
        const isReady = await waitForDaemonReady(exports.DEFAULT_DAEMON_PORT, 25, 400);
        if (isReady) {
            exports.daemonStatus.ready = true;
            exports.daemonStatus.error = null;
            daemonRestartCount = 0;
            console.log(`⚡ [Daemon Supervisor] Primordia Flow Daemon is ONLINE on port ${exports.DEFAULT_DAEMON_PORT}`);
            updateTrayMenu();
            broadcastDaemonStatus();
        }
        else {
            console.warn('[Daemon Supervisor] Daemon process running but healthcheck did not respond within timeout.');
        }
    }
    catch (err) {
        console.error('[Daemon Supervisor] Spawn failed:', err);
        exports.daemonStatus.running = false;
        exports.daemonStatus.error = err.message;
        broadcastDaemonStatus();
    }
}
function stopDaemonSupervisor() {
    if (daemonProcess && exports.daemonStatus.managed) {
        console.log('[Daemon Supervisor] Terminating managed daemon process...');
        try {
            if (process.platform === 'win32' && daemonProcess.pid) {
                const { spawnSync } = require('child_process');
                spawnSync('taskkill', ['/pid', String(daemonProcess.pid), '/T', '/F'], { windowsHide: true });
            }
            else {
                daemonProcess.kill('SIGTERM');
            }
        }
        catch (e) {
            console.error('[Daemon Supervisor] Kill error:', e);
        }
        daemonProcess = null;
        exports.daemonStatus.running = false;
        exports.daemonStatus.ready = false;
    }
}
function broadcastDaemonStatus() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('flow:daemon-status-changed', { ...exports.daemonStatus });
    }
}
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
            const req = http.request({
                hostname: '127.0.0.1',
                port,
                path: requestPath,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(reqData)
                },
                timeout: 15000
            }, (response) => {
                let body = '';
                response.on('data', chunk => body += chunk);
                response.on('end', () => {
                    try {
                        const json = JSON.parse(body);
                        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300 && json.success !== false) {
                            res({ ok: true, data: json });
                        }
                        else {
                            res({ ok: false, error: json.error || `Server responded with status ${response.statusCode}` });
                        }
                    }
                    catch (err) {
                        res({ ok: false, error: 'JSON parse error: ' + err.message });
                    }
                });
            });
            req.on('error', (err) => res({ ok: false, error: err.message }));
            req.on('timeout', () => {
                req.destroy();
                res({ ok: false, error: 'Timeout waiting for /boost' });
            });
            req.write(reqData);
            req.end();
        });
        (async () => {
            let result = await tryRequest(exports.DEFAULT_DAEMON_PORT, '/api/boost');
            if (!result.ok) {
                result = await tryRequest(exports.DEFAULT_DAEMON_PORT, '/api/phom/boost');
            }
            if (!result.ok) {
                result = await tryRequest(exports.DEFAULT_DAEMON_PORT, '/boost');
            }
            if (!result.ok && exports.DEFAULT_DAEMON_PORT !== 3000) {
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
                showDesktopNotification('⚡ Primordia Flow — /boost Completed', `Verified: ${verified} | 🔥 High-Heat: ${highHeat} | Latency: ${latency}ms [${isLive ? 'LIVE' : 'STAGING'}]`, () => navigateToTraces());
                if (highHeat > 0) {
                    setTimeout(() => {
                        showDesktopNotification('🔥 High-Heat Prospects Alert', `${highHeat} high-heat leads scored in top tier! Outreach queue primed.`, () => navigateToTraces());
                    }, 600);
                }
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('flow:boost-completed', payload);
                    const topLeads = Array.isArray(payload.top_leads) ? payload.top_leads : [];
                    if (topLeads.length > 0) {
                        for (const lead of topLeads) {
                            mainWindow.webContents.send('flow:high-heat-lead', lead);
                        }
                    }
                    else if (highHeat > 0) {
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
            }
            else {
                const errorMsg = result.error || 'Unknown /boost failure';
                showDesktopNotification('❌ Primordia Flow — /boost Failed', `Could not execute /boost on port ${exports.DEFAULT_DAEMON_PORT}: ${errorMsg}`);
                reject(new Error(errorMsg));
            }
        })();
    });
}
async function executeBoostFromTray() {
    try {
        showDesktopNotification('⚡ Primordia Flow', `Igniting ${liveMode ? 'LIVE' : 'STAGING'} /boost sovereign cycle...`);
        await executeBoost();
    }
    catch (err) {
        console.error('[Tray Boost Error]', err);
    }
}
function showAndFocusWindow() {
    if (!mainWindow || mainWindow.isDestroyed()) {
        createWindow();
        return;
    }
    if (mainWindow.isMinimized())
        mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
}
async function loadApplicationUrl() {
    if (!mainWindow)
        return;
    if (electron_1.app.isPackaged) {
        fallbackToDist();
        return;
    }
    const isViteUp = await checkPortListening(exports.DEV_PORT, '/');
    if (isViteUp) {
        console.log(`[Window Manager] Loading Vite Live Cockpit: ${exports.DEV_URL}`);
        mainWindow.loadURL(exports.DEV_URL).catch((err) => {
            console.warn('[Window Manager] Failed to load dev URL, falling back to dist...', err.message);
            fallbackToDist();
        });
        return;
    }
    console.log(`[Window Manager] Waiting for Vite dev server on port ${exports.DEV_PORT}...`);
    mainWindow.loadURL(`data:text/html,<html><body style="background:%230a0b0e;color:%2338bdf8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;user-select:none;"><h2 style="margin:0 0 10px 0;letter-spacing:1px;">⚡ Primordia Flow</h2><p style="color:%2394a3b8;font-size:14px;margin:0;">Connecting to sovereign cockpit substrate (http://localhost:${exports.DEV_PORT}/?tab=boost)...</p><div style="margin-top:20px;width:32px;height:32px;border:3px solid %2338bdf8;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;"></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style></body></html>`).catch(() => { });
    let attempts = 0;
    const maxAttempts = 30;
    const retryTimer = setInterval(async () => {
        if (!mainWindow || mainWindow.isDestroyed()) {
            clearInterval(retryTimer);
            return;
        }
        attempts++;
        const viteUp = await checkPortListening(exports.DEV_PORT, '/');
        if (viteUp) {
            clearInterval(retryTimer);
            console.log(`[Window Manager] Vite dev server connected: ${exports.DEV_URL}`);
            mainWindow.loadURL(exports.DEV_URL);
        }
        else if (attempts >= maxAttempts) {
            clearInterval(retryTimer);
            console.warn('[Window Manager] Vite dev server did not start within timeout. Checking production dist...');
            fallbackToDist();
        }
    }, 500);
}
function fallbackToDist() {
    if (!mainWindow)
        return;
    if (fs.existsSync(paths.clientDistHtml)) {
        console.log(`[Window Manager] Loading production bundle: ${paths.clientDistHtml}`);
        mainWindow.loadFile(paths.clientDistHtml, {
            query: { tab: 'boost' }
        });
    }
    else {
        console.warn('[Window Manager] Neither Vite dev server nor client dist HTML could be located.');
        mainWindow.loadURL(`data:text/html,<html><body style="background:%230a0b0e;color:%23f87171;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;"><h2>⚡ Primordia Flow</h2><p style="color:%2394a3b8;">MoneyPlugHub Cockpit dist not found. Run: <code>npm run flow:dev</code></p></body></html>`);
    }
}
function createWindow() {
    let appIcon = undefined;
    if (paths.iconPath && fs.existsSync(paths.iconPath)) {
        appIcon = electron_1.nativeImage.createFromPath(paths.iconPath);
    }
    mainWindow = new electron_1.BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: exports.APP_NAME,
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
        mainWindow?.show();
        mainWindow?.focus();
    });
    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow?.hide();
            return false;
        }
    });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        electron_1.shell.openExternal(url);
        return { action: 'deny' };
    });
    loadApplicationUrl();
    return mainWindow;
}
function registerIpcHandlers() {
    electron_1.ipcMain.handle('flow:trigger-boost', async (_, options) => {
        return await executeBoost(options);
    });
    electron_1.ipcMain.handle('flow:toggle-live-mode', () => {
        return toggleLiveMode();
    });
    electron_1.ipcMain.handle('flow:get-live-mode', () => {
        return liveMode;
    });
    electron_1.ipcMain.handle('flow:set-live-mode', (_, val) => {
        return toggleLiveMode(Boolean(val));
    });
    electron_1.ipcMain.handle('flow:get-daemon-status', () => {
        return { ...exports.daemonStatus };
    });
    electron_1.ipcMain.handle('flow:restart-daemon', async () => {
        stopDaemonSupervisor();
        await new Promise(r => setTimeout(r, 1000));
        await startDaemonSupervisor();
        return { ...exports.daemonStatus };
    });
    electron_1.ipcMain.handle('flow:open-traces', () => {
        navigateToTraces();
    });
    electron_1.ipcMain.handle('flow:show-notification', (_, { title, body }) => {
        showDesktopNotification(title, body);
        return true;
    });
    electron_1.ipcMain.handle('flow:window-minimize', () => {
        if (mainWindow)
            mainWindow.minimize();
    });
    electron_1.ipcMain.handle('flow:window-maximize', () => {
        if (mainWindow) {
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
            }
            else {
                mainWindow.maximize();
            }
        }
    });
    electron_1.ipcMain.handle('flow:window-close', () => {
        if (mainWindow)
            mainWindow.close();
    });
}
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    console.log('[Primordia Flow] Another instance is already active. Exiting duplicate.');
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', () => {
        showAndFocusWindow();
    });
    electron_1.app.whenReady().then(async () => {
        console.log('========================================================');
        console.log(`  ⚡ ${exports.APP_NAME} — Sovereign Antigravity Shell`);
        console.log('========================================================');
        registerIpcHandlers();
        initTray();
        createWindow();
        await startDaemonSupervisor();
        electron_1.app.on('activate', () => {
            if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
            else {
                showAndFocusWindow();
            }
        });
    });
    electron_1.app.on('before-quit', () => {
        isQuitting = true;
        stopDaemonSupervisor();
    });
    electron_1.app.on('window-all-closed', () => {
        if (process.platform === 'darwin') {
            // macOS standard behavior
        }
    });
}
