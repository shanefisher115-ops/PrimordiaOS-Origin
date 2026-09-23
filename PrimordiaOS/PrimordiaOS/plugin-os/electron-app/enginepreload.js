// engine-preload.js

const { contextBridge, ipcRenderer } = require('electron');
const { IPC } = require('./constants');

contextBridge.exposeInMainWorld('Engine', {
  publishState: (state) => ipcRenderer.send(IPC.ENGINE_STATE, state),

  onPriorityUpdate: (handler) =>
    ipcRenderer.on(IPC.PRIORITY_UPDATE, (_e, payload) => handler(payload)),

  onForce: (handler) =>
    ipcRenderer.on(IPC.PHYSICS_APPLY_FORCE, (_e, payload) => handler(payload))
});
