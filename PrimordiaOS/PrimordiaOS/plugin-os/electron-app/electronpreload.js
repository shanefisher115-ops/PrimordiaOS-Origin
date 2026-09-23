const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const { IPC } = require(path.join(__dirname, '../shared/constants.js'));

contextBridge.exposeInMainWorld('Primordial', {
  sendForce: (id, fx, fy) => {
    ipcRenderer.send(IPC.PHYSICS_FORCE, { id, fx, fy });
  },

  subscribeToPhysics: () => {
    ipcRenderer.send(IPC.VIEW_SUBSCRIBE);
  },

  onPhysicsState: (handler) => {
    ipcRenderer.on(IPC.PHYSICS_STATE, (_e, state) => handler(state));
  },

  onPriorityUpdate: (handler) => {
    ipcRenderer.on(IPC.PRIORITY_UPDATE, (_e, payload) => handler(payload));
  }
});
