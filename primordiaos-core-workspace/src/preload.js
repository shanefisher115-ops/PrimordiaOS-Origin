const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    tuneInduction: (bField) => ipcRenderer.send('tune-induction', bField),
    onTensorUpdate: (callback) => ipcRenderer.on('tensor-update', (event, data) => callback(data)),
    onTensorWarning: (callback) => ipcRenderer.on('tensor-warning', (event, data) => callback(data))
});