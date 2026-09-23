// pipeline.js — Engine Pipeline

const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { IPC } = require('./constants');

let engineWindow;

function createEngineWindow() {
  engineWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'engine-preload.js'),
      contextIsolation: true,
      sandbox: true
    }
  });

  engineWindow.loadFile('engine.html');
}

function initPipeline() {
  createEngineWindow();

  ipcMain.on(IPC.VIEW_SUBSCRIBE, (event) => {
    const view = event.sender;
    const forward = (_e, state) => view.send(IPC.ENGINE_STATE, state);
    ipcMain.on(IPC.ENGINE_STATE, forward);
  });

  // NEW: priority update → engine
  ipcMain.on(IPC.PRIORITY_UPDATE, (_e, payload) => {
    engineWindow.webContents.send(IPC.PRIORITY_UPDATE, payload);
  });

  ipcMain.on(IPC.PHYSICS_APPLY_FORCE, (_e, payload) => {
    engineWindow.webContents.send(IPC.PHYSICS_APPLY_FORCE, payload);
  });
}

module.exports = { initPipeline };
