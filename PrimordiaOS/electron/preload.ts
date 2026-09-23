/**
 * ==============================================================================
 * PRIMORDIA FLOW — SECURE IPC PRELOAD SCRIPT (TypeScript)
 * ==============================================================================
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { PrimordiaFlowAPI, BoostExecutionOptions, BoostExecutionResult, DaemonStatus, HighHeatLead } from './primordiaFlow';

export const primordiaFlowAPI: PrimordiaFlowAPI = {
  triggerBoost: (options: BoostExecutionOptions = {}) => {
    return ipcRenderer.invoke('flow:trigger-boost', options);
  },

  toggleLiveMode: () => {
    return ipcRenderer.invoke('flow:toggle-live-mode');
  },

  getLiveMode: () => {
    return ipcRenderer.invoke('flow:get-live-mode');
  },

  setLiveMode: (val: boolean) => {
    return ipcRenderer.invoke('flow:set-live-mode', val);
  },

  getDaemonStatus: () => {
    return ipcRenderer.invoke('flow:get-daemon-status');
  },

  restartDaemon: () => {
    return ipcRenderer.invoke('flow:restart-daemon');
  },

  openTraces: () => {
    return ipcRenderer.invoke('flow:open-traces');
  },

  showNotification: (title: string, body: string) => {
    return ipcRenderer.invoke('flow:show-notification', { title, body });
  },

  minimize: () => ipcRenderer.invoke('flow:window-minimize'),
  maximize: () => ipcRenderer.invoke('flow:window-maximize'),
  close: () => ipcRenderer.invoke('flow:window-close'),

  onBoostCompleted: (callback: (data: BoostExecutionResult) => void) => {
    const handler = (_event: any, data: BoostExecutionResult) => callback(data);
    ipcRenderer.on('flow:boost-completed', handler);
    return () => {
      ipcRenderer.removeListener('flow:boost-completed', handler);
    };
  },

  onHighHeatLead: (callback: (lead: HighHeatLead) => void) => {
    const handler = (_event: any, lead: HighHeatLead) => callback(lead);
    ipcRenderer.on('flow:high-heat-lead', handler);
    return () => {
      ipcRenderer.removeListener('flow:high-heat-lead', handler);
    };
  },

  onLiveModeChanged: (callback: (liveMode: boolean) => void) => {
    const handler = (_event: any, liveMode: boolean) => callback(liveMode);
    ipcRenderer.on('flow:live-mode-changed', handler);
    return () => {
      ipcRenderer.removeListener('flow:live-mode-changed', handler);
    };
  },

  onDaemonStatusChanged: (callback: (status: DaemonStatus) => void) => {
    const handler = (_event: any, status: DaemonStatus) => callback(status);
    ipcRenderer.on('flow:daemon-status-changed', handler);
    return () => {
      ipcRenderer.removeListener('flow:daemon-status-changed', handler);
    };
  },

  onNavigateTraces: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('flow:navigate-traces', handler);
    return () => {
      ipcRenderer.removeListener('flow:navigate-traces', handler);
    };
  },

  version: '1.0.0',
  platform: process.platform,
  appName: 'Primordia Flow'
};

try {
  contextBridge.exposeInMainWorld('primordiaFlow', primordiaFlowAPI);
} catch {
  (window as any).primordiaFlow = primordiaFlowAPI;
}
