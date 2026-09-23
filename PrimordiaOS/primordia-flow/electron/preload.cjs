/**
 * ==============================================================================
 * PRIMORDIA FLOW — SECURE IPC PRELOAD SCRIPT
 * Exposes window.primordiaFlow to the dedicated renderer
 * ==============================================================================
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('primordiaFlow', {
  triggerBoost: () => ipcRenderer.invoke('flow:trigger-boost'),
  getDaemonStatus: () => ipcRenderer.invoke('flow:get-daemon-status'),
  toggleLiveMode: (live) => ipcRenderer.invoke('flow:toggle-live-mode', live),
  showNotification: (title, body) => ipcRenderer.invoke('flow:show-notification', { title, body }),
  openExternal: (url) => ipcRenderer.invoke('flow:open-external', url),
  onBoostTriggered: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('flow:boost-trigger', handler);
    return () => ipcRenderer.removeListener('flow:boost-trigger', handler);
  },
  onLiveModeChanged: (callback) => {
    const handler = (_, live) => callback(live);
    ipcRenderer.on('flow:live-mode-changed', handler);
    return () => ipcRenderer.removeListener('flow:live-mode-changed', handler);
  }
});
