"use strict";
/**
 * ==============================================================================
 * PRIMORDIA FLOW — SECURE IPC PRELOAD SCRIPT (TypeScript)
 * ==============================================================================
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.primordiaFlowAPI = void 0;
const electron_1 = require("electron");
exports.primordiaFlowAPI = {
    triggerBoost: (options = {}) => {
        return electron_1.ipcRenderer.invoke('flow:trigger-boost', options);
    },
    toggleLiveMode: () => {
        return electron_1.ipcRenderer.invoke('flow:toggle-live-mode');
    },
    getLiveMode: () => {
        return electron_1.ipcRenderer.invoke('flow:get-live-mode');
    },
    setLiveMode: (val) => {
        return electron_1.ipcRenderer.invoke('flow:set-live-mode', val);
    },
    getDaemonStatus: () => {
        return electron_1.ipcRenderer.invoke('flow:get-daemon-status');
    },
    restartDaemon: () => {
        return electron_1.ipcRenderer.invoke('flow:restart-daemon');
    },
    openTraces: () => {
        return electron_1.ipcRenderer.invoke('flow:open-traces');
    },
    showNotification: (title, body) => {
        return electron_1.ipcRenderer.invoke('flow:show-notification', { title, body });
    },
    minimize: () => electron_1.ipcRenderer.invoke('flow:window-minimize'),
    maximize: () => electron_1.ipcRenderer.invoke('flow:window-maximize'),
    close: () => electron_1.ipcRenderer.invoke('flow:window-close'),
    onBoostCompleted: (callback) => {
        const handler = (_event, data) => callback(data);
        electron_1.ipcRenderer.on('flow:boost-completed', handler);
        return () => {
            electron_1.ipcRenderer.removeListener('flow:boost-completed', handler);
        };
    },
    onHighHeatLead: (callback) => {
        const handler = (_event, lead) => callback(lead);
        electron_1.ipcRenderer.on('flow:high-heat-lead', handler);
        return () => {
            electron_1.ipcRenderer.removeListener('flow:high-heat-lead', handler);
        };
    },
    onLiveModeChanged: (callback) => {
        const handler = (_event, liveMode) => callback(liveMode);
        electron_1.ipcRenderer.on('flow:live-mode-changed', handler);
        return () => {
            electron_1.ipcRenderer.removeListener('flow:live-mode-changed', handler);
        };
    },
    onDaemonStatusChanged: (callback) => {
        const handler = (_event, status) => callback(status);
        electron_1.ipcRenderer.on('flow:daemon-status-changed', handler);
        return () => {
            electron_1.ipcRenderer.removeListener('flow:daemon-status-changed', handler);
        };
    },
    onNavigateTraces: (callback) => {
        const handler = () => callback();
        electron_1.ipcRenderer.on('flow:navigate-traces', handler);
        return () => {
            electron_1.ipcRenderer.removeListener('flow:navigate-traces', handler);
        };
    },
    version: '1.0.0',
    platform: process.platform,
    appName: 'Primordia Flow'
};
try {
    electron_1.contextBridge.exposeInMainWorld('primordiaFlow', exports.primordiaFlowAPI);
}
catch {
    window.primordiaFlow = exports.primordiaFlowAPI;
}
