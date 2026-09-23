// preload.ts - Electron Preload Script
import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  pingCloud: (clientLabel: string) => Promise<any>;
  calibrateCore: (params: { gravityG: number; fieldRadius: number; frequencyHz: number; reason: string }) => Promise<any>;
  askGemini: (prompt: string) => Promise<any>;
  pullRecords: () => Promise<any>;
  pushRecords: (items: any[]) => Promise<any>;
}

const electronAPI: ElectronAPI = {
  pingCloud: (clientLabel) => ipcRenderer.invoke('cloud:ping', clientLabel),
  calibrateCore: (params) => ipcRenderer.invoke('cloud:calibrate', params),
  askGemini: (prompt) => ipcRenderer.invoke('cloud:gemini', prompt),
  pullRecords: () => ipcRenderer.invoke('cloud:pull-records'),
  pushRecords: (items) => ipcRenderer.invoke('cloud:push-records', items),
};

// Expose the API to the renderer process context
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
