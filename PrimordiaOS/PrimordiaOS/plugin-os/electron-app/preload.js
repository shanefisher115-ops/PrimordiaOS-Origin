"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// preload.ts - Electron Preload Script
const electron_1 = require("electron");
const electronAPI = {
    pingCloud: (clientLabel) => electron_1.ipcRenderer.invoke('cloud:ping', clientLabel),
    calibrateCore: (params) => electron_1.ipcRenderer.invoke('cloud:calibrate', params),
    askGemini: (prompt) => electron_1.ipcRenderer.invoke('cloud:gemini', prompt),
    pullRecords: () => electron_1.ipcRenderer.invoke('cloud:pull-records'),
    pushRecords: (items) => electron_1.ipcRenderer.invoke('cloud:push-records', items),
};
// Expose the API to the renderer process context
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
